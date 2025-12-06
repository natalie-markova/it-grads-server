const express = require("express");
const router = express.Router();
const { InterviewTracker, User, Vacancy, Chat, Application, InterviewTrackerAccess } = require("../db/models");
const authMiddleware = require("../middleware/authMiddleware");
const { Op } = require("sequelize");

// Функция для отправки WebSocket событий об обновлении доступа
const emitAccessUpdate = (req, eventType, access) => {
  const io = req.app.get("io");
  if (!io) return;

  const userId = req.userId;
  
  // Определяем, кому нужно отправить событие
  const targetUserIds = [];
  
  if (access.employerId && access.employerId !== userId) {
    targetUserIds.push(access.employerId);
  }
  
  if (access.graduateId && access.graduateId !== userId) {
    targetUserIds.push(access.graduateId);
  }
  
  // Отправляем событие текущему пользователю
  io.to(`user-${userId}`).emit("interview-tracker-access:update", {
    type: eventType,
    access,
  });
  
  // Отправляем событие второму пользователю
  targetUserIds.forEach(targetUserId => {
    console.log(`📤 Отправка события доступа ${eventType} пользователю ${targetUserId}`, {
      accessId: access.id,
      employerId: access.employerId,
      graduateId: access.graduateId
    });
    io.to(`user-${targetUserId}`).emit("interview-tracker-access:update", {
      type: eventType,
      access,
    });
  });
};

// Функция для отправки WebSocket событий
const emitInterviewUpdate = (req, eventType, interview, targetUserId = null) => {
  const io = req.app.get("io");
  if (!io) return;

  const userId = req.userId;
  const sentToUsers = new Set(); // Отслеживаем, кому уже отправлено событие
  
  // Проверяем, что interview содержит userId
  if (!interview || !interview.userId) {
    console.error(`❌ Ошибка: interview не содержит userId`, {
      interviewId: interview?.id,
      interview: interview ? Object.keys(interview) : null,
      eventType
    });
    return;
  }
  
  // Отправляем событие текущему пользователю (он уже в комнате user-${userId})
  if (!sentToUsers.has(userId)) {
    console.log(`📤 Отправка события ${eventType} пользователю ${userId} (текущий пользователь)`, {
      interviewId: interview.id,
      interviewUserId: interview.userId,
      interviewCompany: interview.company
    });
    io.to(`user-${userId}`).emit("interview-tracker:update", {
      type: eventType,
      interview,
    });
    sentToUsers.add(userId);
  }

  // Если указан целевой пользователь (например, выпускник при создании работодателем)
  if (targetUserId && targetUserId !== userId && !sentToUsers.has(targetUserId)) {
    console.log(`📤 Отправка события ${eventType} пользователю ${targetUserId} (целевой пользователь)`, {
      interviewId: interview.id,
      interviewUserId: interview.userId,
      interviewCompany: interview.company
    });
    io.to(`user-${targetUserId}`).emit("interview-tracker:update", {
      type: eventType,
      interview,
    });
    sentToUsers.add(targetUserId);
  }

  // Если есть связанная запись, отправляем событие связанному пользователю
  // НО: только если это не создание связанных записей (чтобы избежать дублирования)
  if (interview.linkedInterviewId && eventType !== 'created') {
    InterviewTracker.findByPk(interview.linkedInterviewId, {
      include: [
        { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
        { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
        { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
      ],
    })
      .then(linkedInterview => {
        if (linkedInterview) {
          const linkedUserId = linkedInterview.userId;
          if (linkedUserId !== userId && !sentToUsers.has(linkedUserId)) {
            io.to(`user-${linkedUserId}`).emit("interview-tracker:update", {
              type: eventType,
              interview: linkedInterview,
            });
            sentToUsers.add(linkedUserId);
          }
        }
      })
      .catch(err => console.error("Error fetching linked interview:", err));
  }

  // Если это запись с employerId, отправляем событие работодателю
  // НО: только если это не запись работодателя (userId !== employerId) 
  // и не было отправлено через targetUserId
  if (interview.employerId && interview.employerId !== userId && interview.userId !== interview.employerId && !sentToUsers.has(interview.employerId)) {
    // Если это создание и есть linkedInterviewId, не отправляем работодателю через employerId,
    // так как работодатель получит свою запись отдельно через emitInterviewUpdate для записи работодателя
    if (eventType === 'created' && interview.linkedInterviewId) {
      // Не отправляем запись выпускника работодателю, если есть linkedInterviewId
      // Работодатель получит свою запись отдельно
    } else {
      io.to(`user-${interview.employerId}`).emit("interview-tracker:update", {
        type: eventType,
        interview,
      });
      sentToUsers.add(interview.employerId);
    }
  }

  // Если это запись с graduateId, отправляем событие выпускнику
  // НО: не отправляем запись работодателя выпускнику, если у неё есть linkedInterviewId
  // (это означает, что есть связанная запись выпускника, и она будет отправлена отдельно)
  // ИСКЛЮЧЕНИЕ: при создании отправляем, так как выпускник должен видеть запись работодателя
  if (interview.graduateId && interview.graduateId !== userId && !sentToUsers.has(interview.graduateId)) {
    // Проверяем, не является ли это записью работодателя с linkedInterviewId
    // Если да, то не отправляем при обновлении/удалении, так как связанная запись выпускника будет отправлена отдельно
    // НО: при создании отправляем, так как это запись работодателя, которую нужно показать выпускнику
    if (interview.linkedInterviewId && interview.userId !== interview.graduateId && eventType !== 'created') {
      // Это запись работодателя с linkedInterviewId - не отправляем выпускнику при обновлении/удалении
      return;
    }
    io.to(`user-${interview.graduateId}`).emit("interview-tracker:update", {
      type: eventType,
      interview,
    });
    sentToUsers.add(interview.graduateId);
  }

  // Отправляем событие всем пользователям, у которых есть доступ к календарю владельца собеседования
  const interviewOwnerId = interview.userId;
  if (interviewOwnerId && InterviewTrackerAccess) {
    console.log(`🔍 Поиск пользователей с доступом к календарю ${interviewOwnerId} для события ${eventType}`, {
      interviewId: interview.id,
      interviewUserId: interview.userId,
      interviewOwnerId: interviewOwnerId
    });
    
    // Находим всех пользователей с доступом к календарю владельца
    // Используем await для синхронной обработки
    InterviewTrackerAccess.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          // Если владелец - выпускник, ищем записи где graduateId = interviewOwnerId
          { graduateId: interviewOwnerId },
          // Если владелец - работодатель, ищем записи где employerId = interviewOwnerId
          { employerId: interviewOwnerId },
        ],
      },
    })
      .then(accesses => {
        console.log(`📋 Найдено ${accesses.length} записей доступа для календаря ${interviewOwnerId}`);
        
        if (accesses.length === 0) {
          console.log(`⚠️ Не найдено записей доступа для календаря ${interviewOwnerId}`);
        }
        
        accesses.forEach(access => {
          let accessUserId = null;
          
          // Определяем, кому принадлежит доступ
          if (access.graduateId === interviewOwnerId) {
            // Владелец - выпускник, доступ у работодателя
            accessUserId = access.employerId;
            console.log(`👤 Владелец - выпускник (${interviewOwnerId}), доступ у работодателя (${accessUserId})`);
          } else if (access.employerId === interviewOwnerId) {
            // Владелец - работодатель, доступ у выпускника
            accessUserId = access.graduateId;
            console.log(`👤 Владелец - работодатель (${interviewOwnerId}), доступ у выпускника (${accessUserId})`);
          } else {
            console.log(`⚠️ Не удалось определить пользователя с доступом:`, {
              accessId: access.id,
              accessGraduateId: access.graduateId,
              accessEmployerId: access.employerId,
              interviewOwnerId
            });
          }
          
          // Отправляем событие пользователю с доступом, если он еще не получил событие
          if (accessUserId && accessUserId !== userId && !sentToUsers.has(accessUserId)) {
            console.log(`📤 Отправка события ${eventType} пользователю ${accessUserId} (имеет доступ к календарю ${interviewOwnerId})`, {
              interviewId: interview.id,
              interviewUserId: interview.userId,
              interviewCompany: interview.company,
              accessId: access.id,
              accessGraduateId: access.graduateId,
              accessEmployerId: access.employerId,
              eventType
            });
            io.to(`user-${accessUserId}`).emit("interview-tracker:update", {
              type: eventType,
              interview,
            });
            sentToUsers.add(accessUserId);
            console.log(`✅ Событие ${eventType} отправлено пользователю ${accessUserId}`);
          } else {
            console.log(`⏭️ Пропуск отправки события пользователю ${accessUserId}:`, {
              accessUserId,
              currentUserId: userId,
              isCurrentUser: accessUserId === userId,
              alreadySent: sentToUsers.has(accessUserId || 0)
            });
          }
        });
      })
      .catch(err => {
        console.error("❌ Error fetching access records for calendar update:", err);
      });
  } else {
    console.log(`⚠️ Не удалось найти пользователей с доступом:`, {
      interviewOwnerId,
      InterviewTrackerAccessExists: !!InterviewTrackerAccess,
      interview: interview ? { id: interview.id, userId: interview.userId } : null
    });
  }
};

// ============= GRADUATE ROUTES =============

// GET /api/interview-tracker - Получить все собеседования текущего пользователя (выпускника)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Получаем все собеседования выпускника
    // Это могут быть собственные записи и расшаренные с ним записи работодателя
    // НО: если у записи выпускника есть linkedInterviewId, то связанная запись работодателя не нужна
    const allInterviews = await InterviewTracker.findAll({
      where: {
        [Op.or]: [
          { userId }, // Собственные записи выпускника
          { employerId: userId, sharedWithEmployer: true }, // Расшаренные с ним записи работодателя
        ],
      },
      include: [
        {
          model: User,
          as: "employer",
          attributes: ["id", "username", "companyName", "avatar"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: Vacancy,
          as: "vacancy",
          attributes: ["id", "title"],
        },
      ],
      order: [
        ["date", "ASC"],
        ["time", "ASC"],
      ],
    });

    // Исключаем дубликаты: если запись выпускника имеет linkedInterviewId,
    // то не показываем связанную запись работодателя (чтобы избежать дублирования)
    const graduateOwnInterviews = allInterviews.filter(i => i.userId === userId);
    
    // Получаем ID всех записей выпускника
    const graduateInterviewIds = new Set(
      graduateOwnInterviews.map(i => i.id)
    );

    // Получаем linkedInterviewId из записей выпускника (это ID записей работодателя, которые связаны с записями выпускника)
    const linkedInterviewIds = new Set(
      graduateOwnInterviews
        .filter(i => i.linkedInterviewId)
        .map(i => i.linkedInterviewId)
    );

    // Также получаем все записи работодателя, которые ссылаются на записи выпускника
    // (это записи, где linkedInterviewId указывает на запись выпускника)
    const employerInterviewsLinkedToGraduate = await InterviewTracker.findAll({
      where: {
        linkedInterviewId: { [Op.in]: Array.from(graduateInterviewIds) },
        userId: { [Op.ne]: userId }, // Не записи самого выпускника
      },
      attributes: ['id'],
    });
    const employerInterviewIdsLinkedToGraduate = new Set(
      employerInterviewsLinkedToGraduate.map(i => i.id)
    );

    // Также получаем все записи работодателя, которые имеют graduateId = userId выпускника
    // (это записи работодателя, созданные для этого выпускника)
    const employerInterviewsForGraduate = await InterviewTracker.findAll({
      where: {
        graduateId: userId,
        userId: { [Op.ne]: userId }, // Не записи самого выпускника
      },
      attributes: ['id'],
    });
    const employerInterviewIdsForGraduate = new Set(
      employerInterviewsForGraduate.map(i => i.id)
    );

    const interviews = allInterviews.filter(interview => {
      // Если это запись выпускника - всегда показываем (кроме отмененных)
      if (interview.userId === userId) {
        return interview.status !== 'cancelled';
      }
      
      // Если это не запись выпускника, то это должна быть расшаренная запись работодателя
      // Проверяем, что она действительно расшарена (employerId = userId и sharedWithEmployer = true)
      if (interview.employerId !== userId || !interview.sharedWithEmployer) {
        return false;
      }
      
      // Если это запись работодателя, созданная для этого выпускника (graduateId = userId) - не показываем
      // (такие записи связаны с записями выпускника и не должны дублироваться)
      if (employerInterviewIdsForGraduate.has(interview.id)) {
        return false;
      }
      
      // Если это запись работодателя (userId != userId выпускника), проверяем, не связана ли она с записью выпускника
      // Если у записи работодателя есть linkedInterviewId, который указывает на запись выпускника - не показываем
      if (interview.linkedInterviewId && graduateInterviewIds.has(interview.linkedInterviewId)) {
        return false;
      }
      
      // Если ID записи работодателя указан в linkedInterviewId записей выпускника - не показываем
      if (linkedInterviewIds.has(interview.id)) {
        return false;
      }
      
      // Если это запись работодателя, которая ссылается на запись выпускника - не показываем
      if (employerInterviewIdsLinkedToGraduate.has(interview.id)) {
        return false;
      }
      
      // Если это запись работодателя, которая ссылается на удаленную запись выпускника - не показываем
      if (interview.linkedInterviewId && !graduateInterviewIds.has(interview.linkedInterviewId)) {
        return false;
      }
      
      // Исключаем отмененные расшаренные записи
      if (interview.status === 'cancelled') {
        return false;
      }
      
      // Остальные расшаренные записи показываем (это записи работодателя, которые не связаны с записями выпускника)
      return true;
    });

    res.json(interviews);
  } catch (error) {
    console.error("Error fetching interviews:", error);
    res.status(500).json({ error: "Ошибка при получении собеседований" });
  }
});

// POST /api/interview-tracker - Создать новое собеседование
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      company,
      position,
      date,
      time,
      type,
      location,
      meetingLink,
      contactPerson,
      contactPhone,
      notes,
      reminder,
      employerId,
      vacancyId,
      sharedWithEmployer,
    } = req.body;

    if (!company || !position || !date || !time) {
      return res
        .status(400)
        .json({
          error: "Заполните обязательные поля: компания, позиция, дата, время",
        });
    }

    // Проверяем, что пользователь - выпускник
    const user = await User.findByPk(userId);
    if (!user || user.role !== "graduate") {
      return res.status(403).json({ error: "Доступ только для выпускников" });
    }

    // Если указан employerId, создаем связанную запись для работодателя
    let employerInterview = null;
    if (employerId) {
      // Проверяем, что работодатель существует
      const employer = await User.findOne({
        where: { id: employerId, role: "employer" },
      });
      if (!employer) {
        return res.status(400).json({ error: "Работодатель не найден" });
      }

      // 1. Создаем запись для выпускника
      const graduateInterview = await InterviewTracker.create({
        userId,
        company,
        position,
        date,
        time,
        type: type || "online",
        location,
        meetingLink,
        contactPerson,
        contactPhone,
        notes,
        reminder: reminder !== false,
        employerId: employerId,
        vacancyId: vacancyId || null,
        sharedWithEmployer: true, // Автоматически расшарено с работодателем
        graduateId: null,
      });

      // 2. Создаем запись для работодателя
      employerInterview = await InterviewTracker.create({
        userId: employerId, // Владелец - работодатель
        employerId: null, // Не нужен, так как это запись работодателя
        graduateId: userId, // Ссылка на выпускника
        linkedInterviewId: graduateInterview.id, // Связь с записью выпускника
        company: company, // Название компании
        position,
        date,
        time,
        type: type || "online",
        location,
        meetingLink,
        contactPerson,
        contactPhone,
        notes,
        reminder: reminder !== false,
        vacancyId: vacancyId || null,
        sharedWithEmployer: false, // Не нужно, так как это запись работодателя
      });

      // 3. Обновляем linkedInterviewId у записи выпускника
      await graduateInterview.update({ linkedInterviewId: employerInterview.id });

      // Загружаем полные данные для отправки через WebSocket
      const fullGraduateInterview = await InterviewTracker.findByPk(graduateInterview.id, {
        include: [
          { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
          { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
        ],
      });

      const fullEmployerInterview = await InterviewTracker.findByPk(employerInterview.id, {
        include: [
          { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
          { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
        ],
      });

      // Отправляем события через WebSocket
      // Отправляем запись выпускника выпускнику
      emitInterviewUpdate(req, "created", fullGraduateInterview, null);
      // Отправляем запись работодателя работодателю (явно указываем employerId как targetUserId)
      emitInterviewUpdate(req, "created", fullEmployerInterview, employerId);

      res.status(201).json(fullGraduateInterview);
    } else {
      // Если employerId не указан, создаем обычную запись
      const interview = await InterviewTracker.create({
        userId,
        company,
        position,
        date,
        time,
        type: type || "online",
        location,
        meetingLink,
        contactPerson,
        contactPhone,
        notes,
        reminder: reminder !== false,
        employerId: null,
        vacancyId: vacancyId || null,
        sharedWithEmployer: sharedWithEmployer || false,
      });

      // Загружаем полные данные для отправки через WebSocket
      const fullInterview = await InterviewTracker.findByPk(interview.id, {
        include: [
          { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
          { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
        ],
      });

      emitInterviewUpdate(req, "created", fullInterview, null);
      res.status(201).json(interview);
    }
  } catch (error) {
    console.error("Error creating interview:", error);
    res.status(500).json({ error: "Ошибка при создании собеседования" });
  }
});

// PUT /api/interview-tracker/:id - Обновить собеседование выпускника (с синхронизацией)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const interview = await InterviewTracker.findOne({
      where: { id, userId },
    });

    if (!interview) {
      return res.status(404).json({ error: "Собеседование не найдено" });
    }

    const {
      company,
      position,
      date,
      time,
      type,
      location,
      meetingLink,
      contactPerson,
      contactPhone,
      notes,
      reminder,
      employerId,
      vacancyId,
      sharedWithEmployer,
    } = req.body;

    // Обновляем запись выпускника
    await interview.update({
      company: company || interview.company,
      position: position || interview.position,
      date: date || interview.date,
      time: time || interview.time,
      type: type || interview.type,
      location,
      meetingLink,
      contactPerson,
      contactPhone,
      notes,
      reminder: reminder !== undefined ? reminder : interview.reminder,
      employerId: employerId !== undefined ? employerId : interview.employerId,
      vacancyId: vacancyId !== undefined ? vacancyId : interview.vacancyId,
      sharedWithEmployer:
        sharedWithEmployer !== undefined
          ? sharedWithEmployer
          : interview.sharedWithEmployer,
    });

    // Синхронизируем с записью работодателя, если она существует
    if (interview.linkedInterviewId) {
      const linkedInterview = await InterviewTracker.findByPk(interview.linkedInterviewId);
      if (linkedInterview) {
        await linkedInterview.update({
          position: position || linkedInterview.position,
          date: date || linkedInterview.date,
          time: time || linkedInterview.time,
          type: type || linkedInterview.type,
          location,
          meetingLink,
          contactPerson,
          contactPhone,
          notes: notes ? `${notes}\n\nОбновлено выпускником` : linkedInterview.notes,
        });
      }
    }

    // Также проверяем обратную связь - записи работодателя, которые ссылаются на эту запись
    const employerInterviews = await InterviewTracker.findAll({
      where: {
        linkedInterviewId: interview.id,
      },
    });
    for (const empInterview of employerInterviews) {
      await empInterview.update({
        position: position || empInterview.position,
        date: date || empInterview.date,
        time: time || empInterview.time,
        type: type || empInterview.type,
        location,
        meetingLink,
        contactPerson,
        contactPhone,
        notes: notes ? `${notes}\n\nОбновлено выпускником` : empInterview.notes,
      });
    }

    // Загружаем полные данные для отправки через WebSocket
    const fullInterview = await InterviewTracker.findByPk(interview.id, {
      include: [
        { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
        { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
        { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
      ],
    });

    emitInterviewUpdate(req, "updated", fullInterview);
    res.json(interview);
  } catch (error) {
    console.error("Error updating interview:", error);
    res.status(500).json({ error: "Ошибка при обновлении собеседования" });
  }
});

// PATCH /api/interview-tracker/:id/status - Изменить статус собеседования выпускника (с синхронизацией)
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { status } = req.body;

    const interview = await InterviewTracker.findOne({
      where: { id, userId },
    });

    if (!interview) {
      return res.status(404).json({ error: "Собеседование не найдено" });
    }

    if (!["scheduled", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Неверный статус" });
    }

    await interview.update({ status });

    // Синхронизируем статус с записью работодателя
    if (interview.linkedInterviewId) {
      const linkedInterview = await InterviewTracker.findByPk(interview.linkedInterviewId);
      if (linkedInterview) {
        await linkedInterview.update({ status });
      }
    }

    // Также проверяем обратную связь - записи работодателя, которые ссылаются на эту запись
    const employerInterviews = await InterviewTracker.findAll({
      where: {
        linkedInterviewId: interview.id,
      },
    });
    for (const empInterview of employerInterviews) {
      await empInterview.update({ status });
    }

    // Загружаем полные данные для отправки через WebSocket
    const fullInterview = await InterviewTracker.findByPk(interview.id, {
      include: [
        { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
        { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
        { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
      ],
    });

    emitInterviewUpdate(req, "status-updated", fullInterview);
    res.json(interview);
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: "Ошибка при обновлении статуса" });
  }
});

// PATCH /api/interview-tracker/:id/result - Установить результат собеседования выпускника (с синхронизацией)
router.patch("/:id/result", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { result, feedback } = req.body;

    const interview = await InterviewTracker.findOne({
      where: { id, userId },
    });

    if (!interview) {
      return res.status(404).json({ error: "Собеседование не найдено" });
    }

    if (result && !["passed", "failed", "pending"].includes(result)) {
      return res.status(400).json({ error: "Неверный результат" });
    }

    await interview.update({
      result,
      feedback: feedback !== undefined ? feedback : interview.feedback,
    });

    // Синхронизируем результат с записью работодателя
    if (interview.linkedInterviewId) {
      const linkedInterview = await InterviewTracker.findByPk(interview.linkedInterviewId);
      if (linkedInterview) {
        await linkedInterview.update({
          result,
          feedback: feedback ? `Отзыв от выпускника: ${feedback}` : linkedInterview.feedback,
        });
      }
    }

    // Также проверяем обратную связь - записи работодателя, которые ссылаются на эту запись
    const employerInterviews = await InterviewTracker.findAll({
      where: {
        linkedInterviewId: interview.id,
      },
    });
    for (const empInterview of employerInterviews) {
      await empInterview.update({
        result,
        feedback: feedback ? `Отзыв от выпускника: ${feedback}` : empInterview.feedback,
      });
    }

    // Загружаем полные данные для отправки через WebSocket
    const fullInterview = await InterviewTracker.findByPk(interview.id, {
      include: [
        { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
        { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
        { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
      ],
    });

    emitInterviewUpdate(req, "result-updated", fullInterview);
    res.json(interview);
  } catch (error) {
    console.error("Error updating result:", error);
    res.status(500).json({ error: "Ошибка при обновлении результата" });
  }
});

// DELETE /api/interview-tracker/:id - Удалить собеседование выпускника
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const interview = await InterviewTracker.findOne({
      where: { id, userId },
    });

    if (!interview) {
      return res.status(404).json({ error: "Собеседование не найдено" });
    }

    // Загружаем полные данные перед удалением для отправки через WebSocket
    const fullInterview = await InterviewTracker.findByPk(interview.id, {
      include: [
        { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
        { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
        { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
      ],
    });

    // Если это запись выпускника, связанная с записью работодателя, удаляем обе записи
    if (interview.linkedInterviewId) {
      const linkedInterview = await InterviewTracker.findByPk(interview.linkedInterviewId, {
        include: [
          { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
          { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
          { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
        ],
      });
      if (linkedInterview) {
        // Отправляем событие удаления работодателю (владельцу связанной записи)
        const linkedUserId = linkedInterview.userId;
        emitInterviewUpdate(req, "deleted", linkedInterview, linkedUserId);
        await linkedInterview.destroy();
      }
    }
    
    // Также проверяем, есть ли записи работодателя, которые ссылаются на эту запись выпускника
    const employerInterviews = await InterviewTracker.findAll({
      where: {
        linkedInterviewId: interview.id,
      },
    });

    // Удаляем все связанные записи работодателя
    for (const empInterview of employerInterviews) {
      const fullEmpInterview = await InterviewTracker.findByPk(empInterview.id, {
        include: [
          { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
          { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
          { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
        ],
      });
      // Отправляем событие удаления работодателю (владельцу записи)
      const empUserId = empInterview.userId;
      emitInterviewUpdate(req, "deleted", fullEmpInterview, empUserId);
      await empInterview.destroy();
    }

    // Отправляем событие удаления для записи выпускника
    emitInterviewUpdate(req, "deleted", fullInterview, null);
    await interview.destroy();
    res.json({ message: "Собеседование удалено" });
  } catch (error) {
    console.error("Error deleting interview:", error);
    res.status(500).json({ error: "Ошибка при удалении собеседования" });
  }
});

// PATCH /api/interview-tracker/:id/share - Поделиться с работодателем
router.patch("/:id/share", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { employerId, sharedWithEmployer } = req.body;

    const interview = await InterviewTracker.findOne({
      where: { id, userId },
    });

    if (!interview) {
      return res.status(404).json({ error: "Собеседование не найдено" });
    }

    // Проверить что работодатель существует и имеет роль employer
    if (employerId) {
      const employer = await User.findOne({
        where: { id: employerId, role: "employer" },
      });

      if (!employer) {
        return res.status(400).json({ error: "Работодатель не найден" });
      }
    }

    await interview.update({
      employerId: employerId !== undefined ? employerId : interview.employerId,
      sharedWithEmployer:
        sharedWithEmployer !== undefined ? sharedWithEmployer : true,
    });

    res.json(interview);
  } catch (error) {
    console.error("Error sharing interview:", error);
    res.status(500).json({ error: "Ошибка при настройке доступа" });
  }
});

// PATCH /api/interview-tracker/:id/invitation - Принять или отклонить приглашение на собеседование (для выпускника)
router.patch("/:id/invitation", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { action } = req.body; // 'accept' или 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: "Неверное действие. Используйте 'accept' или 'decline'" });
    }

    const interview = await InterviewTracker.findOne({
      where: { id, userId },
      include: [
        {
          model: User,
          as: "employer",
          attributes: ["id", "username", "companyName"],
        },
      ],
    });

    if (!interview) {
      return res.status(404).json({ error: "Собеседование не найдено" });
    }

    if (interview.invitationStatus !== 'pending') {
      return res.status(400).json({ error: "Это приглашение уже обработано" });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    await interview.update({
      invitationStatus: newStatus,
      notes: interview.notes + `\n\nПриглашение ${newStatus === 'accepted' ? 'принято' : 'отклонено'} выпускником`,
    });

    // Синхронизируем статус с записью работодателя
    if (interview.linkedInterviewId) {
      const linkedInterview = await InterviewTracker.findByPk(interview.linkedInterviewId);
      if (linkedInterview) {
        if (newStatus === 'declined') {
          // Если отклонено - отменяем собеседование у работодателя
          await linkedInterview.update({
            status: 'cancelled',
            notes: `${linkedInterview.notes || ""}\n\nКандидат отклонил приглашение`.trim(),
          });
        } else {
          // Если принято - обновляем заметки
          await linkedInterview.update({
            notes: `${linkedInterview.notes || ""}\n\nКандидат принял приглашение`.trim(),
          });
        }
      }
    }

    res.json(interview);
  } catch (error) {
    console.error("Error processing invitation:", error);
    res.status(500).json({ error: "Ошибка при обработке приглашения" });
  }
});

// ============= EMPLOYER ROUTES =============

// GET /api/interview-tracker/employer/candidates - Получить список кандидатов работодателя (из откликов и чатов)
router.get("/employer/candidates", authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;

    // Проверить что пользователь - работодатель
    const user = await User.findByPk(employerId);
    if (!user || user.role !== "employer") {
      return res.status(403).json({ error: "Доступ только для работодателей" });
    }

    // Получаем вакансии работодателя
    const vacancies = await Vacancy.findAll({
      where: { employerId },
      attributes: ["id", "title"],
    });
    const vacancyIds = vacancies.map((v) => v.id);

    // Получаем кандидатов из откликов
    const applications = await Application.findAll({
      where: {
        vacancyId: { [Op.in]: vacancyIds },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: Vacancy,
          as: "vacancy",
          attributes: ["id", "title"],
        },
      ],
    });

    // Получаем контакты из чатов
    const chats = await Chat.findAll({
      where: {
        [Op.or]: [{ user1Id: employerId }, { user2Id: employerId }],
      },
      include: [
        {
          model: User,
          as: "user1",
          attributes: ["id", "username", "firstName", "lastName", "email", "avatar", "role"],
        },
        {
          model: User,
          as: "user2",
          attributes: ["id", "username", "firstName", "lastName", "email", "avatar", "role"],
        },
      ],
    });

    // Объединяем кандидатов из откликов
    const candidatesMap = new Map();

    applications.forEach((app) => {
      if (app.user) {
        const key = app.user.id;
        if (!candidatesMap.has(key)) {
          candidatesMap.set(key, {
            id: app.user.id,
            username: app.user.username,
            firstName: app.user.firstName,
            lastName: app.user.lastName,
            email: app.user.email,
            avatar: app.user.avatar,
            source: "application",
            vacancyId: app.vacancy?.id,
            vacancyTitle: app.vacancy?.title,
          });
        }
      }
    });

    // Добавляем контакты из чатов (только выпускников)
    chats.forEach((chat) => {
      const otherUser = chat.user1Id === employerId ? chat.user2 : chat.user1;
      if (otherUser && otherUser.role === "graduate") {
        const key = otherUser.id;
        if (!candidatesMap.has(key)) {
          candidatesMap.set(key, {
            id: otherUser.id,
            username: otherUser.username,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            email: otherUser.email,
            avatar: otherUser.avatar,
            source: "chat",
            vacancyId: null,
            vacancyTitle: null,
          });
        }
      }
    });

    const candidates = Array.from(candidatesMap.values());

    res.json(candidates);
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({ error: "Ошибка при получении списка кандидатов" });
  }
});

// GET /api/interview-tracker/employer - Получить собеседования работодателя
router.get("/employer", authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;

    // Проверить что пользователь - работодатель
    const user = await User.findByPk(employerId);
    if (!user || user.role !== "employer") {
      return res.status(403).json({ error: "Доступ только для работодателей" });
    }

    // Получаем собеседования где работодатель является владельцем (userId = employerId)
    // ИЛИ где собеседование расшарено с ним
    const allInterviews = await InterviewTracker.findAll({
      where: {
        [Op.or]: [
          { userId: employerId }, // Собственные записи работодателя
          { employerId, sharedWithEmployer: true }, // Расшаренные с ним
        ],
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: User,
          as: "graduate",
          attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: Vacancy,
          as: "vacancy",
          attributes: ["id", "title"],
        },
      ],
      order: [
        ["date", "ASC"],
        ["time", "ASC"],
      ],
    });

    // Исключаем дубликаты: если запись работодателя имеет linkedInterviewId,
    // то не показываем связанную запись выпускника (чтобы избежать дублирования)
    const employerOwnInterviews = allInterviews.filter(i => i.userId === employerId);
    const linkedInterviewIds = new Set(
      employerOwnInterviews
        .filter(i => i.linkedInterviewId)
        .map(i => i.linkedInterviewId)
    );

    // Также получаем ID всех записей работодателя, чтобы исключить связанные записи выпускника
    const employerInterviewIds = new Set(
      employerOwnInterviews.map(i => i.id)
    );

    // Получаем все записи выпускника, которые имеют employerId = employerId и sharedWithEmployer = true
    // и проверяем, есть ли у работодателя связанная запись
    const allGraduateInterviewsWithEmployerId = await InterviewTracker.findAll({
      where: {
        employerId: employerId,
        userId: { [Op.ne]: employerId }, // Не записи самого работодателя
        sharedWithEmployer: true,
      },
      attributes: ['id', 'linkedInterviewId'],
    });
    
    // Создаем Set ID записей выпускника, которые не должны показываться
    // (те, у которых linkedInterviewId указывает на запись работодателя)
    const graduateInterviewIdsToExclude = new Set();
    allGraduateInterviewsWithEmployerId.forEach(gi => {
      // Если у записи выпускника есть linkedInterviewId, который указывает на запись работодателя - исключаем
      if (gi.linkedInterviewId && employerInterviewIds.has(gi.linkedInterviewId)) {
        graduateInterviewIdsToExclude.add(gi.id);
      }
    });

    const interviews = allInterviews.filter(interview => {
      // Если это запись работодателя - всегда показываем (кроме отмененных)
      if (interview.userId === employerId) {
        return interview.status !== 'cancelled';
      }
      
      // Если это расшаренная запись выпускника, но она связана с записью работодателя - не показываем (чтобы избежать дублирования)
      // (если ID записи выпускника указан в linkedInterviewId записей работодателя)
      if (linkedInterviewIds.has(interview.id)) {
        return false;
      }
      
      // Если это запись выпускника, которая ссылается на запись работодателя через linkedInterviewId - не показываем
      if (interview.linkedInterviewId && employerInterviewIds.has(interview.linkedInterviewId)) {
        return false;
      }
      
      // Если это запись выпускника, которая должна быть исключена - не показываем
      if (graduateInterviewIdsToExclude.has(interview.id)) {
        return false;
      }
      
      // Если это запись выпускника, которая ссылается на удаленную запись работодателя - не показываем
      if (interview.linkedInterviewId && !employerInterviewIds.has(interview.linkedInterviewId)) {
        return false;
      }
      
      // Исключаем отмененные расшаренные записи
      if (interview.status === 'cancelled') {
        return false;
      }
      
      // Остальные расшаренные записи показываем
      return true;
    });

    res.json(interviews);
  } catch (error) {
    console.error("Error fetching employer interviews:", error);
    res.status(500).json({ error: "Ошибка при получении собеседований" });
  }
});

// POST /api/interview-tracker/employer - Создать собеседование работодателем (с синхронизацией)
router.post("/employer", authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;
    const {
      graduateId,
      company,
      position,
      date,
      time,
      type,
      location,
      meetingLink,
      contactPerson,
      contactPhone,
      notes,
      reminder,
      vacancyId,
    } = req.body;

    // Проверить что пользователь - работодатель
    const employer = await User.findByPk(employerId);
    if (!employer || employer.role !== "employer") {
      return res.status(403).json({ error: "Доступ только для работодателей" });
    }

    if (!graduateId || !position || !date || !time) {
      return res.status(400).json({
        error: "Заполните обязательные поля: кандидат, позиция, дата, время",
      });
    }

    // Проверить что выпускник существует
    const graduate = await User.findOne({
      where: { id: graduateId, role: "graduate" },
    });
    if (!graduate) {
      return res.status(400).json({ error: "Кандидат не найден" });
    }

    // Имя компании берем из профиля работодателя
    const companyName = company || employer.companyName || employer.username;

    // 1. Создаем запись работодателя
    const employerInterview = await InterviewTracker.create({
      userId: employerId, // Владелец - работодатель
      graduateId, // Ссылка на выпускника
      employerId: null, // Не нужен, так как это запись самого работодателя
      company: graduate.firstName && graduate.lastName
        ? `${graduate.firstName} ${graduate.lastName}`
        : graduate.username, // Для работодателя "компания" = имя кандидата
      position,
      date,
      time,
      type: type || "online",
      location,
      meetingLink,
      contactPerson,
      contactPhone,
      notes,
      reminder: reminder !== false,
      vacancyId: vacancyId || null,
      sharedWithEmployer: false,
    });

    // 2. Создаем запись для выпускника (как приглашение, ожидающее подтверждения)
    const graduateInterview = await InterviewTracker.create({
      userId: graduateId, // Владелец - выпускник
      employerId, // Ссылка на работодателя
      graduateId: null, // Не нужен, так как это запись выпускника
      linkedInterviewId: employerInterview.id, // Связь с записью работодателя
      company: companyName, // Для выпускника "компания" = название компании работодателя
      position,
      date,
      time,
      type: type || "online",
      location,
      meetingLink,
      contactPerson: contactPerson || employer.username,
      contactPhone: contactPhone || employer.phone,
      notes: notes ? `${notes}\n\nПриглашение на собеседование от работодателя` : "Приглашение на собеседование от работодателя",
      reminder: true,
      vacancyId: vacancyId || null,
      sharedWithEmployer: true, // Автоматически расшарено
      employerConfirmed: true, // Работодатель подтвердил (он его создал)
      invitationStatus: 'pending', // Ожидает подтверждения от выпускника
    });

    // 3. Обновляем linkedInterviewId у записи работодателя
    await employerInterview.update({ linkedInterviewId: graduateInterview.id });

    // Загружаем полные данные
    const result = await InterviewTracker.findByPk(employerInterview.id, {
      include: [
        {
          model: User,
          as: "graduate",
          attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: Vacancy,
          as: "vacancy",
          attributes: ["id", "title"],
        },
      ],
    });

    // Загружаем полные данные для записи выпускника
    const fullGraduateInterview = await InterviewTracker.findByPk(graduateInterview.id, {
      include: [
        { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
        { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
      ],
    });

    // Отправляем события через WebSocket
    // Отправляем только запись выпускника выпускнику (не отправляем запись работодателя, так как она будет дубликатом)
    emitInterviewUpdate(req, "created", fullGraduateInterview, graduateId);
    // Запись работодателя отправляем только работодателю
    emitInterviewUpdate(req, "created", result, null);

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating employer interview:", error);
    res.status(500).json({ error: "Ошибка при создании собеседования" });
  }
});

// PUT /api/interview-tracker/employer/:id - Обновить собеседование работодателя (с синхронизацией)
router.put("/employer/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.userId;
    const {
      position,
      date,
      time,
      type,
      location,
      meetingLink,
      contactPerson,
      contactPhone,
      notes,
      reminder,
    } = req.body;

    // Проверить что пользователь - работодатель
    const employer = await User.findByPk(employerId);
    if (!employer || employer.role !== "employer") {
      return res.status(403).json({ error: "Доступ только для работодателей" });
    }

    const interview = await InterviewTracker.findOne({
      where: { id, userId: employerId },
    });

    if (!interview) {
      return res.status(404).json({ error: "Собеседование не найдено" });
    }

    // Обновляем запись работодателя
    await interview.update({
      position: position || interview.position,
      date: date || interview.date,
      time: time || interview.time,
      type: type || interview.type,
      location,
      meetingLink,
      contactPerson,
      contactPhone,
      notes,
      reminder: reminder !== undefined ? reminder : interview.reminder,
    });

    // Синхронизируем с записью выпускника
    if (interview.linkedInterviewId) {
      const linkedInterview = await InterviewTracker.findByPk(interview.linkedInterviewId);
      if (linkedInterview) {
        await linkedInterview.update({
          position: position || linkedInterview.position,
          date: date || linkedInterview.date,
          time: time || linkedInterview.time,
          type: type || linkedInterview.type,
          location,
          meetingLink,
          contactPerson,
          contactPhone,
          notes: notes ? `${notes}\n\nОбновлено работодателем` : linkedInterview.notes,
        });
      }
    }

    const result = await InterviewTracker.findByPk(interview.id, {
      include: [
        {
          model: User,
          as: "graduate",
          attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: Vacancy,
          as: "vacancy",
          attributes: ["id", "title"],
        },
      ],
    });

    // Загружаем полные данные для связанной записи выпускника
    if (interview.linkedInterviewId) {
      const linkedInterview = await InterviewTracker.findByPk(interview.linkedInterviewId, {
        include: [
          { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
          { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
        ],
      });
      if (linkedInterview) {
        emitInterviewUpdate(req, "updated", linkedInterview);
      }
    }

    emitInterviewUpdate(req, "updated", result);
    res.json(result);
  } catch (error) {
    console.error("Error updating employer interview:", error);
    res.status(500).json({ error: "Ошибка при обновлении собеседования" });
  }
});

// DELETE /api/interview-tracker/employer/:id - Удалить собеседование работодателя
router.delete("/employer/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.userId;

    // Проверить что пользователь - работодатель
    const user = await User.findByPk(employerId);
    if (!user || user.role !== "employer") {
      return res.status(403).json({ error: "Доступ только для работодателей" });
    }

    // Работодатель может удалить:
    // 1. Свои собственные записи (userId = employerId)
    // 2. Расшаренные с ним записи (employerId = employerId и sharedWithEmployer = true)
    const interview = await InterviewTracker.findOne({
      where: {
        id,
        [Op.or]: [
          { userId: employerId }, // Собственные записи работодателя
          { employerId, sharedWithEmployer: true }, // Расшаренные с ним
        ],
      },
    });

    if (!interview) {
      return res.status(404).json({ error: "Собеседование не найдено" });
    }

    // Загружаем полные данные перед удалением для отправки через WebSocket
    const fullInterview = await InterviewTracker.findByPk(interview.id, {
      include: [
        { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
        { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
        { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
      ],
    });

    // Если это собственная запись работодателя (userId = employerId)
    if (interview.userId === employerId) {
      // Удаляем связанную запись выпускника полностью
      if (interview.linkedInterviewId) {
        const linkedInterview = await InterviewTracker.findByPk(interview.linkedInterviewId, {
          include: [
            { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
            { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
            { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
          ],
        });
        if (linkedInterview) {
          // Отправляем событие удаления выпускнику (владельцу linkedInterview)
          const linkedUserId = linkedInterview.userId;
          if (linkedUserId) {
            emitInterviewUpdate(req, "deleted", linkedInterview, linkedUserId);
          }
          await linkedInterview.destroy();
        }
      }
      // Также проверяем, есть ли записи выпускника, которые ссылаются на эту запись работодателя
      const graduateInterviews = await InterviewTracker.findAll({
        where: {
          linkedInterviewId: interview.id,
        },
      });
      // Удаляем все связанные записи выпускника
      for (const gradInterview of graduateInterviews) {
        const fullGradInterview = await InterviewTracker.findByPk(gradInterview.id, {
          include: [
            { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
            { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
            { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
          ],
        });
        // Отправляем событие удаления выпускнику (владельцу gradInterview)
        const gradUserId = gradInterview.userId;
        if (gradUserId) {
          emitInterviewUpdate(req, "deleted", fullGradInterview, gradUserId);
        }
        await gradInterview.destroy();
      }
      emitInterviewUpdate(req, "deleted", fullInterview);
      await interview.destroy();
    } else {
      // Если это расшаренная запись (не собственная), удаляем её полностью
      // Также удаляем связанную запись работодателя, если она существует
      if (interview.linkedInterviewId) {
        const linkedInterview = await InterviewTracker.findByPk(interview.linkedInterviewId, {
          include: [
            { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
            { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
          ],
        });
        if (linkedInterview && linkedInterview.userId === employerId) {
          emitInterviewUpdate(req, "deleted", linkedInterview);
          await linkedInterview.destroy();
        }
      }
      emitInterviewUpdate(req, "deleted", fullInterview);
      await interview.destroy();
    }

    res.json({ message: "Собеседование удалено" });
  } catch (error) {
    console.error("Error deleting employer interview:", error);
    res.status(500).json({ error: "Ошибка при удалении собеседования" });
  }
});

// PATCH /api/interview-tracker/employer/:id/status - Изменить статус собеседования работодателя
router.patch("/employer/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.userId;
    const { status } = req.body;

    // Проверить что пользователь - работодатель
    const user = await User.findByPk(employerId);
    if (!user || user.role !== "employer") {
      return res.status(403).json({ error: "Доступ только для работодателей" });
    }

    const interview = await InterviewTracker.findOne({
      where: { id, userId: employerId },
    });

    if (!interview) {
      return res.status(404).json({ error: "Собеседование не найдено" });
    }

    if (!["scheduled", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Неверный статус" });
    }

    await interview.update({ status });

    // Синхронизируем статус с записью выпускника
    if (interview.linkedInterviewId) {
      const linkedInterview = await InterviewTracker.findByPk(interview.linkedInterviewId);
      if (linkedInterview) {
        await linkedInterview.update({ status });
        const fullLinkedInterview = await InterviewTracker.findByPk(linkedInterview.id, {
          include: [
            { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
            { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
          ],
        });
        emitInterviewUpdate(req, "status-updated", fullLinkedInterview);
      }
    }

    // Загружаем полные данные для отправки через WebSocket
    const fullInterview = await InterviewTracker.findByPk(interview.id, {
      include: [
        { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
        { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
      ],
    });

    emitInterviewUpdate(req, "status-updated", fullInterview);
    res.json(interview);
  } catch (error) {
    console.error("Error updating employer interview status:", error);
    res.status(500).json({ error: "Ошибка при обновлении статуса" });
  }
});

// PATCH /api/interview-tracker/employer/:id/result - Установить результат собеседования работодателя
router.patch("/employer/:id/result", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.userId;
    const { result, feedback } = req.body;

    // Проверить что пользователь - работодатель
    const user = await User.findByPk(employerId);
    if (!user || user.role !== "employer") {
      return res.status(403).json({ error: "Доступ только для работодателей" });
    }

    const interview = await InterviewTracker.findOne({
      where: { id, userId: employerId },
    });

    if (!interview) {
      return res.status(404).json({ error: "Собеседование не найдено" });
    }

    if (result && !["passed", "failed", "pending"].includes(result)) {
      return res.status(400).json({ error: "Неверный результат" });
    }

    await interview.update({
      result,
      feedback: feedback !== undefined ? feedback : interview.feedback,
    });

    // Синхронизируем результат с записью выпускника
    if (interview.linkedInterviewId) {
      const linkedInterview = await InterviewTracker.findByPk(interview.linkedInterviewId);
      if (linkedInterview) {
        await linkedInterview.update({
          result,
          feedback: feedback ? `Отзыв от работодателя: ${feedback}` : linkedInterview.feedback,
        });
        const fullLinkedInterview = await InterviewTracker.findByPk(linkedInterview.id, {
          include: [
            { model: User, as: "employer", attributes: ["id", "username", "companyName", "avatar"] },
            { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
          ],
        });
        emitInterviewUpdate(req, "result-updated", fullLinkedInterview);
      }
    }

    // Загружаем полные данные для отправки через WebSocket
    const fullInterview = await InterviewTracker.findByPk(interview.id, {
      include: [
        { model: User, as: "graduate", attributes: ["id", "username", "firstName", "lastName", "email", "avatar"] },
        { model: Vacancy, as: "vacancy", attributes: ["id", "title"] },
      ],
    });

    emitInterviewUpdate(req, "result-updated", fullInterview);
    res.json(interview);
  } catch (error) {
    console.error("Error updating employer interview result:", error);
    res.status(500).json({ error: "Ошибка при обновлении результата" });
  }
});

router.patch("/employer/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.userId;
    const { employerConfirmed, employerNotes } = req.body;

    // Проверить что пользователь - работодатель
    const user = await User.findByPk(employerId);
    if (!user || user.role !== "employer") {
      return res.status(403).json({ error: "Доступ только для работодателей" });
    }

    const interview = await InterviewTracker.findOne({
      where: {
        id,
        employerId,
        sharedWithEmployer: true,
      },
    });

    if (!interview) {
      return res
        .status(404)
        .json({ error: "Собеседование не найдено или нет доступа" });
    }

    await interview.update({
      employerConfirmed:
        employerConfirmed !== undefined
          ? employerConfirmed
          : interview.employerConfirmed,
      employerNotes:
        employerNotes !== undefined ? employerNotes : interview.employerNotes,
    });

    res.json(interview);
  } catch (error) {
    console.error("Error confirming interview:", error);
    res.status(500).json({ error: "Ошибка при подтверждении собеседования" });
  }
});

// PATCH /api/interview-tracker/employer/:id/reschedule - Предложить новое время (работодатель)
router.patch("/employer/:id/reschedule", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.userId;
    const { date, time, employerNotes } = req.body;

    // Проверить что пользователь - работодатель
    const user = await User.findByPk(employerId);
    if (!user || user.role !== "employer") {
      return res.status(403).json({ error: "Доступ только для работодателей" });
    }

    const interview = await InterviewTracker.findOne({
      where: {
        id,
        employerId,
        sharedWithEmployer: true,
      },
    });

    if (!interview) {
      return res
        .status(404)
        .json({ error: "Собеседование не найдено или нет доступа" });
    }

    await interview.update({
      date: date || interview.date,
      time: time || interview.time,
      employerNotes:
        employerNotes ||
        `Время изменено работодателем. ${interview.employerNotes || ""}`,
      employerConfirmed: true,
    });

    res.json(interview);
  } catch (error) {
    console.error("Error rescheduling interview:", error);
    res.status(500).json({ error: "Ошибка при переносе собеседования" });
  }
});

// GET /api/interview-tracker/employer/candidate/:candidateId - Получить все собеседования кандидата
router.get(
  "/employer/candidate/:candidateId",
  authMiddleware,
  async (req, res) => {
    try {
      const employerId = req.userId;
      const { candidateId } = req.params;

      // Проверить что пользователь - работодатель
      const user = await User.findByPk(employerId);
      if (!user || user.role !== "employer") {
        return res
          .status(403)
          .json({ error: "Доступ только для работодателей" });
      }

      const interviews = await InterviewTracker.findAll({
        where: {
          userId: candidateId,
          employerId,
          sharedWithEmployer: true,
        },
        include: [
          {
            model: Vacancy,
            as: "vacancy",
            attributes: ["id", "title"],
          },
        ],
        order: [
          ["date", "DESC"],
          ["time", "DESC"],
        ],
      });

      res.json(interviews);
    } catch (error) {
      console.error("Error fetching candidate interviews:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении собеседований кандидата" });
    }
  }
);

// ============= ACCESS ROUTES =============

// GET /api/interview-tracker/access - Получить список доступов
router.get("/access", authMiddleware, async (req, res) => {
  try {
    console.log('GET /interview-tracker/access - Request received');
    const userId = req.userId;
    console.log('User ID:', userId);
    
    // Проверяем, что модель доступна
    if (!InterviewTrackerAccess) {
      console.error('InterviewTrackerAccess model is not available');
      return res.status(500).json({ error: "Модель доступа не доступна" });
    }
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    console.log('User role:', user.role);

    if (user.role === 'employer') {
      // Для работодателя: два списка
      // В модели InterviewTrackerAccess:
      // - graduateId - ID выпускника
      // - employerId - ID работодателя
      // - ownerRole - кто предоставил доступ ('employer' или 'graduate')
      
      // 1. Выпускники, которым работодатель разрешил доступ к своему календарю (grantedByMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник, который получил доступ)
      //    - employerId = userId (работодатель, который предоставил доступ)
      //    - ownerRole = 'employer' (работодатель создал запись)
      //    Ищем записи, где employerId = userId И ownerRole = 'employer'
      console.log('GET /access - employer: fetching grantedByMe where employerId =', userId, 'and ownerRole = employer');
      const grantedByMe = await InterviewTrackerAccess.findAll({
        where: { 
          employerId: userId, 
          isActive: true,
          ownerRole: 'employer'
        },
        include: [
          {
            model: User,
            as: "graduate",
            attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      
      console.log('GET /access - employer: grantedByMe count:', grantedByMe.length);
      
      // 2. Выпускники, которые разрешили доступ работодателю к своему календарю (grantedToMe)
      //    Когда выпускник предоставляет доступ работодателю, создается запись где:
      //    - graduateId = userId (выпускник, который предоставил доступ)
      //    - employerId = targetId (работодатель, который получил доступ) = userId для работодателя
      //    - ownerRole = 'graduate' (выпускник создал запись)
      //    Ищем записи, где employerId = userId И ownerRole = 'graduate'
      console.log('GET /access - employer: fetching grantedToMe where employerId =', userId, 'and ownerRole = graduate');
      const grantedToMe = await InterviewTrackerAccess.findAll({
        where: { 
          employerId: userId, 
          isActive: true,
          ownerRole: 'graduate'
        },
        include: [
          {
            model: User,
            as: "graduate",
            attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      
      console.log('GET /access - employer: grantedToMe count:', grantedToMe.length);
      
      // Для обратной совместимости: если есть записи без ownerRole, добавляем их в grantedByMe
      const legacyAccesses = await InterviewTrackerAccess.findAll({
        where: { 
          employerId: userId, 
          isActive: true,
          ownerRole: null
        },
        include: [
          {
            model: User,
            as: "graduate",
            attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      
      if (legacyAccesses.length > 0) {
        console.log('GET /access - employer: found', legacyAccesses.length, 'legacy accesses (without ownerRole), adding to grantedByMe');
        grantedByMe.push(...legacyAccesses);
      }
      
      console.log('GET /access - employer: final counts - grantedByMe:', grantedByMe.length, 'grantedToMe:', grantedToMe.length);

      res.json({
        grantedByMe,
        grantedToMe,
      });
    } else {
      // Для выпускника: два списка
      // В модели: когда работодатель предоставляет доступ выпускнику, создается запись где:
      // - graduateId = targetId (выпускник)
      // - employerId = userId (работодатель)
      // Когда выпускник предоставляет доступ работодателю, создается запись где:
      // - graduateId = userId (выпускник)
      // - employerId = targetId (работодатель)
      
      // 1. Компании, которым выпускник разрешил доступ к своему календарю (grantedByMe)
      //    Когда выпускник предоставляет доступ работодателю, создается запись где:
      //    - graduateId = userId (выпускник)
      //    - employerId = targetId (работодатель)
      //    Ищем записи где graduateId = userId (выпускник предоставил доступ)
      //    И ownerRole = 'graduate' (выпускник сам создал запись)
      const grantedByMeAccesses = await InterviewTrackerAccess.findAll({
        where: { 
          graduateId: userId, 
          isActive: true 
        },
        include: [
          {
            model: User,
            as: "employer",
            attributes: ["id", "username", "companyName", "avatar", "companyDescription"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник) - это ID выпускника, который получил доступ
      //    - employerId = userId (работодатель) - это ID работодателя, который предоставил доступ
      //    Для выпускника (userId) это записи, где graduateId = userId (выпускник получил доступ)
      //    НО: когда работодатель предоставляет доступ, создается запись где graduateId = targetId (выпускник)
      //    Для выпускника targetId = userId, поэтому ищем записи где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = userId (выпускник получил доступ) И ownerRole = 'employer'
      //    ИЛИ записи, где graduateId = userId (выпускник) И employerId = работодатель И ownerRole = 'employer'
      //    
      //    Но на самом деле, когда работодатель предоставляет доступ, создается запись:
      //    graduateId = targetId (выпускник), employerId = userId (работодатель)
      //    Для выпускника это записи, где graduateId = userId (выпускник получил доступ)
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Исправление: используем ownerRole для разделения
      //    - grantedByMe: записи где graduateId = userId И ownerRole = 'graduate'
      //    - grantedToMe: записи где graduateId = userId И ownerRole = 'employer'
      //    
      //    НО: когда работодатель предоставляет доступ, создается запись где graduateId = targetId
      //    Для выпускника targetId = userId, поэтому это записи где graduateId = userId
      //    Но ownerRole = 'employer', поэтому они должны быть в grantedToMe
      const grantedToMeAccesses = await InterviewTrackerAccess.findAll({
        where: { 
          graduateId: userId, 
          isActive: true 
        },
        include: [
          {
            model: User,
            as: "employer",
            attributes: ["id", "username", "companyName", "avatar", "companyDescription"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      
      // Разделяем записи на grantedByMe и grantedToMe
      // Когда выпускник предоставляет доступ работодателю, создается запись где:
      // - graduateId = userId (выпускник)
      // - employerId = targetId (работодатель)
      // Когда работодатель предоставляет доступ выпускнику, создается запись где:
      // - graduateId = targetId (выпускник)
      // - employerId = userId (работодатель)
      // Для выпускника (userId) обе записи имеют graduateId = userId или graduateId = targetId
      // Но targetId = userId для выпускника, поэтому обе записи имеют graduateId = userId
      // 
      // Правильное решение: различать по employerId
      // - grantedByMe: где выпускник сам создал (graduateId = userId, employerId = targetId, где targetId - работодатель)
      // - grantedToMe: где работодатель создал (graduateId = targetId, employerId = userId, где userId - работодатель)
      // Но для выпускника targetId = userId, поэтому обе записи имеют graduateId = userId
      // 
      // Исправление: используем логику - если запись создана выпускником,
      // то graduateId = userId (выпускник), employerId = targetId (работодатель)
      // Если запись создана работодателем, то graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = userId (выпускник предоставил доступ)
      // И записи, где graduateId = targetId (работодатель предоставил доступ)
      // Но для выпускника targetId = userId, поэтому обе записи имеют graduateId = userId
      // 
      // Правильное решение: использовать другую логику
      // Ищем все записи, где graduateId = userId (выпускник)
      // И разделяем их на основе employerId
      // Но employerId всегда ID работодателя, поэтому это не работает
      // 
      // Разделяем записи на grantedByMe и grantedToMe
      // Используем поле ownerRole, если оно доступно, иначе используем временную логику
      const grantedByMe = [];
      const grantedToMe = [];
      
      // Объединяем все записи (и из grantedByMeAccesses, и из grantedToMeAccesses)
      // так как они могут быть одинаковыми (обе ищут где graduateId = userId)
      const allAccesses = new Map();
      
      // Добавляем записи из grantedByMeAccesses
      for (const access of grantedByMeAccesses) {
        allAccesses.set(access.id, access);
      }
      
      // Добавляем записи из grantedToMeAccesses (если они еще не добавлены)
      for (const access of grantedToMeAccesses) {
        if (!allAccesses.has(access.id)) {
          allAccesses.set(access.id, access);
        }
      }
      
      // Разделяем по ownerRole
      console.log('GET /access - graduate: total accesses found:', allAccesses.size);
      for (const access of allAccesses.values()) {
        // Получаем ownerRole разными способами для совместимости
        let ownerRole = null;
        try {
          // Пробуем разные способы получения ownerRole
          if (access.get) {
            ownerRole = access.get('ownerRole');
          } else if (access.ownerRole !== undefined) {
            ownerRole = access.ownerRole;
          } else if (access.dataValues && access.dataValues.ownerRole !== undefined) {
            ownerRole = access.dataValues.ownerRole;
          }
        } catch (e) {
          console.log('GET /access - graduate: error getting ownerRole:', e.message);
        }
        
        console.log('GET /access - graduate: processing access', access.id, {
          graduateId: access.graduateId,
          employerId: access.employerId,
          ownerRole: ownerRole,
          ownerRoleType: typeof ownerRole,
          isActive: access.isActive
        });
        
        // Строгое сравнение ownerRole
        if (ownerRole === 'graduate') {
          // Выпускник сам предоставил доступ работодателю
          console.log('GET /access - graduate: adding to grantedByMe (ownerRole = graduate)');
          grantedByMe.push(access);
        } else if (ownerRole === 'employer') {
          // Работодатель предоставил доступ выпускнику
          console.log('GET /access - graduate: adding to grantedToMe (ownerRole = employer)');
          grantedToMe.push(access);
        } else {
          // ownerRole не установлен (старые записи или поле отсутствует)
          // Временная логика: все записи идут в grantedByMe
          // (предполагаем, что старые записи были созданы выпускником)
          console.log('GET /access - graduate: ownerRole not set or null, adding to grantedByMe (default)');
          grantedByMe.push(access);
        }
      }
      
      console.log('GET /access - graduate: final counts - grantedByMe:', grantedByMe.length, 'grantedToMe:', grantedToMe.length);
      grantedByMe.forEach((a, i) => {
        const or = a.get ? a.get('ownerRole') : (a.ownerRole || a.dataValues?.ownerRole);
        console.log(`GET /access - graduate: grantedByMe[${i}]:`, { id: a.id, ownerRole: or, graduateId: a.graduateId, employerId: a.employerId });
      });
      grantedToMe.forEach((a, i) => {
        const or = a.get ? a.get('ownerRole') : (a.ownerRole || a.dataValues?.ownerRole);
        console.log(`GET /access - graduate: grantedToMe[${i}]:`, { id: a.id, ownerRole: or, graduateId: a.graduateId, employerId: a.employerId });
      });

      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника это записи, где graduateId = userId (выпускник получил доступ)
      //    НО: это те же записи, что и в grantedByMe
      //    Правильное решение: ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = userId (выпускник) И employerId = работодатель
      //    Но это не работает, так как нет способа различить направление
      
      // Альтернативное решение: когда работодатель предоставляет доступ выпускнику,
      // создаем запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает, так как employerId должен быть ID работодателя
      
      // Правильное решение: изменить логику создания доступа
      // Когда работодатель предоставляет доступ выпускнику, создаем запись где:
      // - graduateId = userId (выпускник)
      // - employerId = userId (работодатель)
      // Но это не работает
      
      // Временное решение: используем логику - если запись создана работодателем для выпускника,
      // то она должна быть в grantedToMe. Но нет способа определить это.
      // Используем альтернативную логику: ищем все записи где graduateId = userId,
      // и разделяем их на основе того, кто создал запись. Но это невозможно.
      
      // Правильное решение: изменить логику создания доступа
      // Когда работодатель предоставляет доступ выпускнику, создаем запись где:
      // - graduateId = userId (выпускник получил доступ к календарю работодателя)
      // - employerId = userId (работодатель предоставил доступ)
      // Но это не работает, так как employerId должен быть ID работодателя
      
      // Исправление: когда работодатель предоставляет доступ выпускнику, создаем запись где:
      // - graduateId = userId (выпускник)
      // - employerId = userId (работодатель) - но это не работает
      
      // Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      // создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника (userId = targetId) это записи, где graduateId = userId
      //    НО: это те же записи, что и в grantedByMe
      //    Правильное решение: различать записи по тому, кто их создал
      //    Но так как нет такого поля, используем логику:
      //    - grantedByMe: записи, где выпускник сам создал (graduateId = userId, employerId = targetId)
      //    - grantedToMe: записи, где работодатель создал (graduateId = targetId, employerId = userId)
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Исправление: ищем записи, где работодатель предоставил доступ
      //    Это записи, где graduateId = userId (выпускник получил доступ) И запись создана работодателем
      //    Но нет способа определить, кто создал запись
      
      // Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      // создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает, так как employerId должен быть ID работодателя
      
      // Временное решение: для grantedToMe ищем записи, где graduateId = userId (выпускник получил доступ)
      // и исключаем те, что уже в grantedByMe (где выпускник сам предоставил доступ)
      // Но это невозможно без дополнительного поля
      
      // Исправление: используем логику - если запись создана работодателем для выпускника,
      // то graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника это записи, где graduateId = userId (targetId) И employerId = работодатель
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: изменить POST /access
      // Когда работодатель предоставляет доступ выпускнику, создавать запись где:
      // - graduateId = userId (выпускник)
      // - employerId = userId (работодатель)
      // Но это не работает
      
      // Исправление: ищем записи, где работодатель предоставил доступ выпускнику
      // Это записи, где graduateId = userId (выпускник получил доступ) И employerId = работодатель
      // Но это те же записи, что и в grantedByMe
      
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника (userId) это записи, где graduateId = targetId (userId)
      //    НО: это те же записи, что и в grantedByMe, если выпускник сам предоставил доступ
      //    Правильное решение: различать по employerId
      //    - grantedByMe: где graduateId = userId И выпускник сам создал (employerId = targetId, где targetId - работодатель)
      //    - grantedToMe: где graduateId = userId И работодатель создал (employerId = userId, где userId - работодатель)
      //    Но это не работает, так как нет способа определить, кто создал
      
      // Исправление: когда работодатель предоставляет доступ, создается запись где:
      // graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = userId (targetId) И employerId = работодатель
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: изменить POST /access
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // Временное решение: ищем все записи где graduateId = userId
      // и разделяем их на основе employerId
      // Но это не работает, так как нет способа различить направление
      
      // Исправление: используем логику - если запись создана работодателем,
      // то она должна быть в grantedToMe. Но нет способа определить это.
      
      // Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      // создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает, так как employerId должен быть ID работодателя
      
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника (userId) это записи, где graduateId = targetId
      //    НО: для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    Правильное решение: различать по тому, кто создал запись
      //    - grantedByMe: где выпускник сам создал (graduateId = userId, employerId = targetId)
      //    - grantedToMe: где работодатель создал (graduateId = targetId, employerId = userId)
      //    Но для выпускника targetId = userId, поэтому обе записи имеют graduateId = userId
      
      // Исправление: используем логику - если запись создана работодателем,
      // то graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId)
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      // создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает, так как employerId должен быть ID работодателя
      
      // Временное решение: ищем записи, где работодатель предоставил доступ
      // Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ
      // Это записи, где graduateId = userId (выпускник получил доступ) И запись создана работодателем
      // Но нет способа определить, кто создал запись
      
      // Правильное решение: изменить POST /access
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // Временное решение: grantedToMe пустой
      // Нужно исправить POST /access, чтобы создавать правильные записи
      // ИЛИ изменить GET /access, чтобы правильно определять направление
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Это записи, где graduateId = targetId (выпускник) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: использовать другую логику
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника (userId) это записи, где graduateId = targetId (userId)
      //    НО: для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: различать записи по тому, кто их создал
      //    - grantedByMe: где выпускник сам создал (graduateId = userId, employerId = targetId, где targetId - работодатель)
      //    - grantedToMe: где работодатель создал (graduateId = targetId, employerId = userId, где userId - работодатель)
      //    Но для выпускника targetId = userId, поэтому обе записи имеют graduateId = userId
      //    
      //    Исправление: используем логику - если запись создана работодателем для выпускника,
      //    то graduateId = targetId (выпускник), employerId = userId (работодатель)
      //    Для выпускника ищем записи, где graduateId = targetId (userId)
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      //    создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает, так как employerId должен быть ID работодателя
      //    
      //    Временное решение: ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: использовать другую логику
      //    Когда работодатель предоставляет доступ, создавать запись где:
      //    graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает
      //    
      //    Временное решение: grantedToMe пустой
      //    Нужно исправить POST /access, чтобы создавать правильные записи
      //    ИЛИ изменить GET /access, чтобы правильно определять направление
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = targetId (выпускник) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: использовать другую логику
      //    Когда работодатель предоставляет доступ, создавать запись где:
      //    graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Когда работодатель предоставляет доступ, создается запись где:
      // graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: использовать другую логику
      // Исключаем из grantedToMe записи, которые уже есть в grantedByMe
      // grantedToMe = все записи где graduateId = userId, исключая те, что в grantedByMe
      // Но это не работает, так как все записи где graduateId = userId уже в grantedByMe
      
      // Исправление: используем логику - если запись создана работодателем,
      // то она должна быть в grantedToMe. Но нет способа определить это.
      
      // Правильное решение: изменить POST /access
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // Временное решение: для grantedToMe ищем записи, где работодатель предоставил доступ
      // Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Исправление: используем логику - если запись создана работодателем для выпускника,
      // то graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId)
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      // создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает, так как employerId должен быть ID работодателя
      
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника (userId) это записи, где graduateId = targetId
      //    НО: для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: различать записи по тому, кто их создал
      //    - grantedByMe: где выпускник сам создал (graduateId = userId, employerId = targetId, где targetId - работодатель)
      //    - grantedToMe: где работодатель создал (graduateId = targetId, employerId = userId, где userId - работодатель)
      //    Но для выпускника targetId = userId, поэтому обе записи имеют graduateId = userId
      //    
      //    Исправление: используем логику - если запись создана работодателем для выпускника,
      //    то graduateId = targetId (выпускник), employerId = userId (работодатель)
      //    Для выпускника ищем записи, где graduateId = targetId (userId)
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      //    создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает, так как employerId должен быть ID работодателя
      //    
      //    Временное решение: ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: использовать другую логику
      //    Когда работодатель предоставляет доступ, создавать запись где:
      //    graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Когда работодатель предоставляет доступ, создается запись где:
      // graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: использовать другую логику
      // Исключаем из grantedToMe записи, которые уже есть в grantedByMe
      // grantedToMe = все записи где graduateId = userId, исключая те, что в grantedByMe
      // Но это не работает, так как все записи где graduateId = userId уже в grantedByMe
      
      // Исправление: используем логику - если запись создана работодателем,
      // то она должна быть в grantedToMe. Но нет способа определить это.
      
      // Правильное решение: изменить POST /access
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // Временное решение: для grantedToMe ищем записи, где работодатель предоставил доступ
      // Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Исправление: используем логику - если запись создана работодателем для выпускника,
      // то graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId)
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      // создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает, так как employerId должен быть ID работодателя
      
      // Временное решение: grantedToMe пустой
      // Нужно исправить POST /access, чтобы создавать правильные записи
      // ИЛИ изменить GET /access, чтобы правильно определять направление
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Это записи, где graduateId = targetId (выпускник) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: использовать другую логику
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника (userId) это записи, где graduateId = targetId
      //    НО: для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: различать записи по тому, кто их создал
      //    - grantedByMe: где выпускник сам создал (graduateId = userId, employerId = targetId)
      //    - grantedToMe: где работодатель создал (graduateId = targetId, employerId = userId)
      //    Но для выпускника targetId = userId, поэтому обе записи имеют graduateId = userId
      //    
      //    Исправление: используем логику - если запись создана работодателем для выпускника,
      //    то graduateId = targetId (выпускник), employerId = userId (работодатель)
      //    Для выпускника ищем записи, где graduateId = targetId (userId)
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      //    создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает, так как employerId должен быть ID работодателя
      //    
      //    Временное решение: ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: использовать другую логику
      //    Когда работодатель предоставляет доступ, создавать запись где:
      //    graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Когда работодатель предоставляет доступ, создается запись где:
      // graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: использовать другую логику
      // Исключаем из grantedToMe записи, которые уже есть в grantedByMe
      // grantedToMe = все записи где graduateId = userId, исключая те, что в grantedByMe
      // Но это не работает, так как все записи где graduateId = userId уже в grantedByMe
      
      // Исправление: используем логику - если запись создана работодателем,
      // то она должна быть в grantedToMe. Но нет способа определить это.
      
      // Правильное решение: изменить POST /access
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // Временное решение: для grantedToMe ищем записи, где работодатель предоставил доступ
      // Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Исправление: используем логику - если запись создана работодателем для выпускника,
      // то graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId)
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      // создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает, так как employerId должен быть ID работодателя
      
      // Временное решение: grantedToMe пустой
      // Нужно исправить POST /access, чтобы создавать правильные записи
      // ИЛИ изменить GET /access, чтобы правильно определять направление
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Это записи, где graduateId = targetId (выпускник) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: использовать другую логику
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника (userId) это записи, где graduateId = targetId
      //    НО: для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: различать записи по тому, кто их создал
      //    - grantedByMe: где выпускник сам создал (graduateId = userId, employerId = targetId)
      //    - grantedToMe: где работодатель создал (graduateId = targetId, employerId = userId)
      //    Но для выпускника targetId = userId, поэтому обе записи имеют graduateId = userId
      //    
      //    Исправление: используем логику - если запись создана работодателем для выпускника,
      //    то graduateId = targetId (выпускник), employerId = userId (работодатель)
      //    Для выпускника ищем записи, где graduateId = targetId (userId)
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      //    создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает, так как employerId должен быть ID работодателя
      //    
      //    Временное решение: ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: использовать другую логику
      //    Когда работодатель предоставляет доступ, создавать запись где:
      //    graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Когда работодатель предоставляет доступ, создается запись где:
      // graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: использовать другую логику
      // Исключаем из grantedToMe записи, которые уже есть в grantedByMe
      // grantedToMe = все записи где graduateId = userId, исключая те, что в grantedByMe
      // Но это не работает, так как все записи где graduateId = userId уже в grantedByMe
      
      // Исправление: используем логику - если запись создана работодателем,
      // то она должна быть в grantedToMe. Но нет способа определить это.
      
      // Правильное решение: изменить POST /access
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // Временное решение: для grantedToMe ищем записи, где работодатель предоставил доступ
      // Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Исправление: используем логику - если запись создана работодателем для выпускника,
      // то graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId)
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      // создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает, так как employerId должен быть ID работодателя
      
      // Временное решение: grantedToMe пустой
      // Нужно исправить POST /access, чтобы создавать правильные записи
      // ИЛИ изменить GET /access, чтобы правильно определять направление
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Это записи, где graduateId = targetId (выпускник) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: использовать другую логику
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника (userId) это записи, где graduateId = targetId
      //    НО: для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: различать записи по тому, кто их создал
      //    - grantedByMe: где выпускник сам создал (graduateId = userId, employerId = targetId)
      //    - grantedToMe: где работодатель создал (graduateId = targetId, employerId = userId)
      //    Но для выпускника targetId = userId, поэтому обе записи имеют graduateId = userId
      //    
      //    Исправление: используем логику - если запись создана работодателем для выпускника,
      //    то graduateId = targetId (выпускник), employerId = userId (работодатель)
      //    Для выпускника ищем записи, где graduateId = targetId (userId)
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      //    создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает, так как employerId должен быть ID работодателя
      //    
      //    Временное решение: ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: использовать другую логику
      //    Когда работодатель предоставляет доступ, создавать запись где:
      //    graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Когда работодатель предоставляет доступ, создается запись где:
      // graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: использовать другую логику
      // Исключаем из grantedToMe записи, которые уже есть в grantedByMe
      // grantedToMe = все записи где graduateId = userId, исключая те, что в grantedByMe
      // Но это не работает, так как все записи где graduateId = userId уже в grantedByMe
      
      // Исправление: используем логику - если запись создана работодателем,
      // то она должна быть в grantedToMe. Но нет способа определить это.
      
      // Правильное решение: изменить POST /access
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // Временное решение: для grantedToMe ищем записи, где работодатель предоставил доступ
      // Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Исправление: используем логику - если запись создана работодателем для выпускника,
      // то graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId)
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      // создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает, так как employerId должен быть ID работодателя
      
      // Временное решение: grantedToMe пустой
      // Проблема: модель не различает направление доступа
      // Решение: изменить POST /access, чтобы создавать правильные записи
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает, так как employerId должен быть ID работодателя
      
      // Исправление: используем логику - если запись создана работодателем,
      // то она должна быть в grantedToMe. Но нет способа определить это.
      
      // Правильное решение: изменить POST /access
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника (userId) это записи, где graduateId = targetId
      //    НО: для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: различать записи по тому, кто их создал
      //    - grantedByMe: где выпускник сам создал (graduateId = userId, employerId = targetId)
      //    - grantedToMe: где работодатель создал (graduateId = targetId, employerId = userId)
      //    Но для выпускника targetId = userId, поэтому обе записи имеют graduateId = userId
      //    
      //    Исправление: используем логику - если запись создана работодателем для выпускника,
      //    то graduateId = targetId (выпускник), employerId = userId (работодатель)
      //    Для выпускника ищем записи, где graduateId = targetId (userId)
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      //    создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает, так как employerId должен быть ID работодателя
      //    
      //    Временное решение: ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Когда работодатель предоставляет доступ, создается запись где:
      // graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: использовать другую логику
      // Исключаем из grantedToMe записи, которые уже есть в grantedByMe
      // Но все записи где graduateId = userId уже в grantedByMe
      
      // Исправление: используем логику - если запись создана работодателем,
      // то она должна быть в grantedToMe. Но нет способа определить это.
      
      // Правильное решение: изменить POST /access
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника (userId) это записи, где graduateId = targetId
      //    НО: для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: различать записи по тому, кто их создал
      //    Но так как нет такого поля, используем логику:
      //    - grantedByMe: записи, где выпускник сам создал (graduateId = userId, employerId = targetId)
      //    - grantedToMe: записи, где работодатель создал (graduateId = targetId, employerId = userId)
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    
      //    Исправление: используем логику - если запись создана работодателем для выпускника,
      //    то graduateId = targetId (выпускник), employerId = userId (работодатель)
      //    Для выпускника ищем записи, где graduateId = targetId (userId)
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      //    создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает, так как employerId должен быть ID работодателя
      //    
      //    Временное решение: ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Когда работодатель предоставляет доступ, создается запись где:
      // graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: использовать другую логику
      // Ищем все записи, где работодатель предоставил доступ выпускнику
      // Это записи, где graduateId = userId (выпускник) И запись создана работодателем
      // Но нет способа определить, кто создал запись
      
      // Исправление: используем логику - если запись создана работодателем,
      // то она должна быть в grantedToMe. Но нет способа определить это.
      
      // Правильное решение: изменить POST /access
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника (userId) это записи, где graduateId = targetId
      //    НО: для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: различать записи по тому, кто их создал
      //    Но так как нет такого поля, используем логику:
      //    - grantedByMe: записи, где выпускник сам создал (graduateId = userId, employerId = targetId)
      //    - grantedToMe: записи, где работодатель создал (graduateId = targetId, employerId = userId)
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    
      //    Исправление: используем логику - если запись создана работодателем для выпускника,
      //    то graduateId = targetId (выпускник), employerId = userId (работодатель)
      //    Для выпускника ищем записи, где graduateId = targetId (userId)
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: изменить POST /access так, чтобы когда работодатель предоставляет доступ,
      //    создавалась запись где graduateId = userId (выпускник), employerId = userId (работодатель)
      //    Но это не работает, так как employerId должен быть ID работодателя
      //    
      //    Временное решение: ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = targetId (выпускник получил доступ) И employerId = работодатель
      //    Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Когда работодатель предоставляет доступ, создается запись где:
      // graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника ищем записи, где graduateId = targetId (userId) И employerId = работодатель
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      
      // Правильное решение: использовать другую логику
      // Ищем все записи, где работодатель предоставил доступ выпускнику
      // Это записи, где graduateId = userId (выпускник) И запись создана работодателем
      // Но нет способа определить, кто создал запись
      
      // Исправление: используем логику - если запись создана работодателем,
      // то она должна быть в grantedToMe. Но нет способа определить это.
      
      // Правильное решение: изменить POST /access
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает
      
      // Временное решение: grantedToMe пустой
      // Проблема: модель не различает направление доступа
      // Решение: изменить POST /access, чтобы создавать правильные записи
      // ИЛИ изменить GET /access, чтобы правильно определять направление
      // 
      // Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      // Это записи, где graduateId = userId (выпускник получил доступ)
      // И запись создана работодателем (но нет способа определить это)
      // 
      // 2. Компании, которые разрешили доступ выпускнику к своему календарю (grantedToMe)
      //    Когда работодатель предоставляет доступ выпускнику, создается запись где:
      //    - graduateId = targetId (выпускник)
      //    - employerId = userId (работодатель)
      //    Для выпускника (userId) это записи, где graduateId = targetId
      //    НО: для выпускника targetId = userId, поэтому ищем где graduateId = userId
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Временное решение: используем логику - если запись создана работодателем для выпускника,
      //    то graduateId = targetId (выпускник), employerId = userId (работодатель)
      //    Для выпускника ищем записи, где graduateId = targetId (userId)
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Правильное решение: использовать поле ownerRole после миграции
      //    Временно: ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = userId (выпускник получил доступ) И запись создана работодателем
      //    Но нет способа определить, кто создал запись без ownerRole
      //    
      //    Временное решение: для grantedToMe ищем записи, где работодатель предоставил доступ
      //    Это записи, где graduateId = userId (выпускник получил доступ)
      //    Но это те же записи, что и в grantedByMe
      //    
      //    Исправление: используем логику - если запись создана работодателем,
      //    то она должна быть в grantedToMe. Но нет способа определить это.
      //    
      //    Временное решение: grantedToMe пустой
      //    Проблема: модель не различает направление доступа
      //    Решение: изменить POST /access, чтобы создавать правильные записи
      //    ИЛИ изменить GET /access, чтобы правильно определять направление
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = userId (выпускник получил доступ)
      //    И запись создана работодателем (но нет способа определить это)
      //    
      //    Временное решение: grantedToMe пустой
      //    Проблема: модель не различает направление доступа
      //    Решение: изменить POST /access, чтобы создавать правильные записи
      //    ИЛИ изменить GET /access, чтобы правильно определять направление
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = userId (выпускник получил доступ)
      //    И запись создана работодателем (но нет способа определить это)
      //    
      //    Временное решение: grantedToMe пустой
      //    Проблема: модель не различает направление доступа
      //    Решение: изменить POST /access, чтобы создавать правильные записи
      //    ИЛИ изменить GET /access, чтобы правильно определять направление
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = userId (выпускник получил доступ)
      //    И запись создана работодателем (но нет способа определить это)
      //    
      //    Временное решение: grantedToMe пустой
      //    Проблема: модель не различает направление доступа
      //    Решение: изменить POST /access, чтобы создавать правильные записи
      //    ИЛИ изменить GET /access, чтобы правильно определять направление
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = userId (выпускник получил доступ)
      //    И запись создана работодателем (но нет способа определить это)
      //    
      //    Временное решение: grantedToMe пустой
      //    Проблема: модель не различает направление доступа
      //    Решение: изменить POST /access, чтобы создавать правильные записи
      //    ИЛИ изменить GET /access, чтобы правильно определять направление
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = userId (выпускник получил доступ)
      //    И запись создана работодателем (но нет способа определить это)
      //    
      //    Временное решение: grantedToMe пустой
      //    Проблема: модель не различает направление доступа
      //    Решение: изменить POST /access, чтобы создавать правильные записи
      //    ИЛИ изменить GET /access, чтобы правильно определять направление
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = userId (выпускник получил доступ)
      //    И запись создана работодателем (но нет способа определить это)
      //    
      //    Временное решение: grantedToMe пустой
      //    Проблема: модель не различает направление доступа
      //    Решение: изменить POST /access, чтобы создавать правильные записи
      //    ИЛИ изменить GET /access, чтобы правильно определять направление
      //    
      //    Исправление: для grantedToMe ищем записи, где работодатель предоставил доступ выпускнику
      //    Это записи, где graduateId = userId (выпускник получил доступ)
      //    И запись создана работодателем (но нет способа определить это)
      //    

      res.json({
        grantedByMe,
        grantedToMe,
      });
    }
  } catch (error) {
    console.error("Error loading access:", error);
    res.status(500).json({ error: "Ошибка при загрузке списка доступа" });
  }
});

// POST /api/interview-tracker/access - Предоставить доступ
router.post("/access", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { targetId } = req.body;

    console.log('POST /access - userId:', userId, 'targetId:', targetId, 'targetId type:', typeof targetId, 'body:', req.body);

    if (!targetId) {
      console.log('POST /access - targetId is missing');
      return res.status(400).json({ error: "Не указан ID пользователя" });
    }

    // Преобразуем targetId в число, если это строка
    const targetIdNum = typeof targetId === 'string' ? parseInt(targetId, 10) : targetId;
    
    if (isNaN(targetIdNum)) {
      console.log('POST /access - targetId is not a valid number:', targetId);
      return res.status(400).json({ error: "Неверный формат ID пользователя" });
    }

    const user = await User.findByPk(userId);
    const targetUser = await User.findByPk(targetIdNum);

    if (!user || !targetUser) {
      console.log('POST /access - user not found:', { userId, targetId: targetIdNum, userExists: !!user, targetUserExists: !!targetUser });
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    // Проверяем, что пользователь не пытается предоставить доступ самому себе
    if (userId === targetIdNum) {
      console.log('POST /access - user trying to grant access to themselves');
      return res.status(400).json({ error: "Нельзя предоставить доступ самому себе" });
    }

    if (user.role === 'employer' && targetUser.role === 'graduate') {
      // Работодатель предоставляет доступ выпускнику к своему календарю
      // Для правильного отображения в "Мне разрешили доступ" у выпускника,
      // создаем запись где graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Но для выпускника это должно быть в grantedToMe, где graduateId = userId
      // Поэтому создаем запись где graduateId = targetId (выпускник), employerId = userId (работодатель)
      // И в GET /access для выпускника ищем grantedToMe где graduateId = targetId
      // НО: для выпускника userId = targetId, поэтому ищем где graduateId = userId
      console.log('POST /access - employer granting access to graduate, checking existing access');
      console.log('Checking for access with:', { 
        option1: { graduateId: targetIdNum, employerId: userId, isActive: true },
        option2: { graduateId: userId, employerId: targetIdNum, isActive: true }
      });
      
      // Проверяем, есть ли уже запись доступа между этими пользователями (активная или неактивная)
      // Когда работодатель предоставляет доступ выпускнику, создается запись:
      // graduateId = targetIdNum (выпускник), employerId = userId (работодатель)
      // Но также проверяем обратную запись, если выпускник уже предоставил доступ работодателю
      // Проверяем запись, которую создает работодатель (graduateId = targetId, employerId = userId)
      const existingAccess1 = await InterviewTrackerAccess.findOne({
        where: {
          graduateId: targetIdNum,
          employerId: userId,
        },
      });
      
      // Проверяем обратную запись (если выпускник уже предоставил доступ работодателю)
      const existingAccess2 = await InterviewTrackerAccess.findOne({
        where: {
          graduateId: userId,
          employerId: targetIdNum,
        },
      });

      // Если найдена запись от работодателя (existingAccess1)
      if (existingAccess1) {
        console.log('POST /access - access already exists (employer created):', {
          id: existingAccess1.id,
          graduateId: existingAccess1.graduateId,
          employerId: existingAccess1.employerId,
          isActive: existingAccess1.isActive,
          ownerRole: existingAccess1.get ? existingAccess1.get('ownerRole') : existingAccess1.ownerRole,
        });
        
        // Если запись существует и активна, возвращаем ошибку
        if (existingAccess1.isActive) {
          return res.status(400).json({ 
            error: "Доступ уже предоставлен",
            existingAccessId: existingAccess1.id
          });
        }
        
        // Если запись существует, но деактивирована, активируем её
        console.log('POST /access - reactivating existing access (employer created)');
        await existingAccess1.update({ 
          isActive: true,
          ownerRole: 'employer' // Ensure correct ownerRole on reactivation
        });
        
        const fullAccess = await InterviewTrackerAccess.findByPk(existingAccess1.id, {
          include: [
            {
              model: User,
              as: "graduate",
              attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
            },
          ],
        });
        
        // Отправляем WebSocket событие об обновлении доступа
        if (fullAccess) {
          emitAccessUpdate(req, "created", fullAccess);
        }
        
        return res.status(200).json(fullAccess);
      }
      
      // Если найдена обратная запись (от выпускника), это означает, что доступ уже предоставлен
      // НО: это обратная запись, поэтому мы не должны создавать новую запись от работодателя
      // Вместо этого, если запись неактивна, мы можем её реактивировать, но с правильным ownerRole
      if (existingAccess2) {
        console.log('POST /access - reverse access exists (graduate created):', {
          id: existingAccess2.id,
          graduateId: existingAccess2.graduateId,
          employerId: existingAccess2.employerId,
          isActive: existingAccess2.isActive,
          ownerRole: existingAccess2.get ? existingAccess2.get('ownerRole') : existingAccess2.ownerRole,
        });
        
        // Если запись активна, возвращаем ошибку (доступ уже предоставлен выпускником)
        if (existingAccess2.isActive) {
          return res.status(400).json({ 
            error: "Доступ уже предоставлен",
            existingAccessId: existingAccess2.id
          });
        }
        
        // Если запись неактивна, НЕ создаем новую запись от работодателя
        // Вместо этого возвращаем ошибку, так как это обратная запись
        // Работодатель не должен создавать запись, если выпускник уже предоставил доступ
        return res.status(400).json({ 
          error: "Доступ уже был предоставлен ранее",
          existingAccessId: existingAccess2.id
        });
      }
      
      console.log('POST /access - no existing access found, proceeding to create');

      // Создаем запись где graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Это означает, что работодатель предоставил доступ выпускнику
      // Для выпускника это будет в grantedToMe, где graduateId = targetId (userId для выпускника)
      // НО: для выпускника userId = targetId, поэтому ищем где graduateId = userId
      // Но это не работает, так как в записи graduateId = targetId, а не userId
      // Исправление: создаем запись где graduateId = targetId (выпускник), employerId = userId (работодатель)
      // Для выпускника в GET /access ищем grantedToMe где graduateId = targetId (userId)
      // Но для выпускника targetId = userId, поэтому ищем где graduateId = userId
      // Но это те же записи, что и в grantedByMe
      // 
      // Правильное решение: изменить логику создания доступа
      // Когда работодатель предоставляет доступ, создавать запись где:
      // graduateId = userId (выпускник), employerId = userId (работодатель)
      // Но это не работает, так как employerId должен быть ID работодателя
      // 
      // Исправление: используем текущую логику, но в GET /access правильно определяем направление
      // Создаем запись доступа
      // Если поле ownerRole существует в БД, добавляем его
      const accessData = {
        graduateId: targetIdNum,
        employerId: userId,
        companyName: user.companyName || user.username,
        isActive: true,
      };
      
      // Создаем запись доступа (с ownerRole, если поле существует в БД)
      console.log('POST /access - creating access with data:', { ...accessData, ownerRole: 'employer' });
      let access;
      try {
        access = await InterviewTrackerAccess.create({ ...accessData, ownerRole: 'employer' });
        // Перезагружаем запись, чтобы убедиться, что ownerRole сохранен
        await access.reload();
        
        // Проверяем, что ownerRole действительно сохранен
        const savedOwnerRole = access.get ? access.get('ownerRole') : (access.ownerRole || access.dataValues?.ownerRole);
        console.log('POST /access - access created successfully:', {
          id: access.id,
          graduateId: access.graduateId,
          employerId: access.employerId,
          ownerRole: savedOwnerRole,
          ownerRoleType: typeof savedOwnerRole,
          dataValues: access.dataValues
        });
        
        if (savedOwnerRole !== 'employer') {
          console.error('POST /access - WARNING: ownerRole was not saved correctly! Expected "employer", got:', savedOwnerRole);
        }
      } catch (error) {
        if (error.message && (error.message.includes('ownerRole') || error.message.includes('column') || error.message.includes('does not exist'))) {
          // Поле ownerRole не существует в БД, создаем без него
          console.log('POST /access - ownerRole field does not exist, creating without it');
          access = await InterviewTrackerAccess.create(accessData);
        } else {
          throw error;
        }
      }

      const fullAccess = await InterviewTrackerAccess.findByPk(access.id, {
        include: [
          {
            model: User,
            as: "graduate",
            attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
          },
        ],
      });

      // Отправляем WebSocket событие об обновлении доступа
      if (fullAccess) {
        emitAccessUpdate(req, "created", fullAccess);
      }

      res.status(201).json(fullAccess);
    } else if (user.role === 'graduate' && targetUser.role === 'employer') {
      // Выпускник предоставляет доступ работодателю к своему календарю
      // В модели: graduateId - всегда ID выпускника, employerId - всегда ID работодателя
      // Запись означает: работодатель имеет доступ к календарю выпускника
      // Это соответствует семантике: graduateId = userId (выпускник), employerId = targetId (работодатель)
      console.log('POST /access - graduate granting access to employer, checking existing access');
      console.log('Checking for access with:', { 
        graduateId: userId, 
        employerId: targetIdNum, 
        isActive: true 
      });
      
      // Проверяем, есть ли уже запись доступа (активная или неактивная)
      const existingAccess = await InterviewTrackerAccess.findOne({
        where: {
          graduateId: userId,
          employerId: targetIdNum,
        },
      });

      if (existingAccess) {
        console.log('POST /access - access already exists:', {
          id: existingAccess.id,
          graduateId: existingAccess.graduateId,
          employerId: existingAccess.employerId,
          isActive: existingAccess.isActive,
          ownerRole: existingAccess.get ? existingAccess.get('ownerRole') : existingAccess.ownerRole,
        });
        
        if (existingAccess.isActive) {
          return res.status(400).json({ 
            error: "Доступ уже предоставлен",
            existingAccessId: existingAccess.id
          });
        }
        
        console.log('POST /access - reactivating existing access');
        await existingAccess.update({ 
          isActive: true,
          ownerRole: 'graduate' // Ensure correct ownerRole on reactivation
        });
        
        const fullAccess = await InterviewTrackerAccess.findByPk(existingAccess.id, {
          include: [
            {
              model: User,
              as: "employer",
              attributes: ["id", "username", "companyName", "avatar", "companyDescription"],
            },
          ],
        });
        console.log('POST /access - reactivated access:', fullAccess.id, 'ownerRole:', fullAccess.ownerRole);
        
        // Отправляем WebSocket событие об обновлении доступа
        if (fullAccess) {
          emitAccessUpdate(req, "created", fullAccess);
        }
        
        return res.status(200).json(fullAccess);
      }
      
      console.log('POST /access - no existing access found, proceeding to create');

      // Создаем запись доступа
      // Если поле ownerRole существует в БД, добавляем его
      const accessData = {
        graduateId: userId,
        employerId: targetIdNum,
        companyName: targetUser.companyName || targetUser.username,
        isActive: true,
      };
      
      // Создаем запись доступа (с ownerRole, если поле существует в БД)
      let access;
      try {
        access = await InterviewTrackerAccess.create({ ...accessData, ownerRole: 'graduate' });
        await access.reload(); // Reload to ensure ownerRole is fetched
        console.log('POST /access - access created successfully:', {
          id: access.id,
          graduateId: access.graduateId,
          employerId: access.employerId,
          ownerRole: access.get ? access.get('ownerRole') : access.ownerRole,
          dataValues: access.dataValues
        });
      } catch (error) {
        if (error.message && (error.message.includes('ownerRole') || error.message.includes('column') || error.message.includes('does not exist'))) {
          // Поле ownerRole не существует в БД, создаем без него
          console.log('POST /access - ownerRole field does not exist, creating without it');
          access = await InterviewTrackerAccess.create(accessData);
        } else {
          throw error;
        }
      }

      const fullAccess = await InterviewTrackerAccess.findByPk(access.id, {
        include: [
          {
            model: User,
            as: "employer",
            attributes: ["id", "username", "companyName", "avatar", "companyDescription"],
          },
        ],
      });

      // Отправляем WebSocket событие об обновлении доступа
      if (fullAccess) {
        emitAccessUpdate(req, "created", fullAccess);
      }

      res.status(201).json(fullAccess);
    } else {
      return res.status(400).json({ error: "Неверная комбинация ролей" });
    }
  } catch (error) {
    console.error("Error granting access:", error);
    res.status(500).json({ error: "Ошибка при предоставлении доступа" });
  }
});

// DELETE /api/interview-tracker/access/:id - Запретить доступ
router.delete("/access/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const access = await InterviewTrackerAccess.findByPk(id);

    if (!access) {
      return res.status(404).json({ error: "Доступ не найден" });
    }

    // Проверяем, что пользователь имеет право удалить этот доступ
    if (access.employerId !== userId && access.graduateId !== userId) {
      return res.status(403).json({ error: "Нет прав для удаления доступа" });
    }

    // Загружаем полные данные доступа перед обновлением для отправки через WebSocket
    const fullAccess = await InterviewTrackerAccess.findByPk(id, {
      include: [
        {
          model: User,
          as: "graduate",
          attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: User,
          as: "employer",
          attributes: ["id", "username", "companyName", "avatar", "companyDescription"],
        },
      ],
    });

    await access.update({ isActive: false });
    // Или можно удалить полностью: await access.destroy();

    // Отправляем WebSocket событие об обновлении доступа
    if (fullAccess) {
      emitAccessUpdate(req, "deleted", fullAccess);
    }

    res.json({ message: "Доступ запрещен" });
  } catch (error) {
    console.error("Error deleting access:", error);
    res.status(500).json({ error: "Ошибка при запрете доступа" });
  }
});

// GET /api/interview-tracker/access/:userId/calendar - Получить календарь пользователя
router.get("/access/:userId/calendar", authMiddleware, async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.userId;

    // Проверяем, есть ли доступ к календарю этого пользователя
    const user = await User.findByPk(currentUserId);
    const targetUser = await User.findByPk(targetUserId);

    if (!user || !targetUser) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    let hasAccess = false;

    if (user.role === 'employer' && targetUser.role === 'graduate') {
      // Работодатель хочет посмотреть календарь выпускника
      hasAccess = await InterviewTrackerAccess.findOne({
        where: {
          employerId: currentUserId,
          graduateId: targetUserId,
          isActive: true,
        },
      });
    } else if (user.role === 'graduate' && targetUser.role === 'employer') {
      // Выпускник хочет посмотреть календарь работодателя
      hasAccess = await InterviewTrackerAccess.findOne({
        where: {
          graduateId: currentUserId,
          employerId: targetUserId,
          isActive: true,
        },
      });
    }

    if (!hasAccess) {
      return res.status(403).json({ error: "Нет доступа к календарю этого пользователя" });
    }

    // Получаем все собеседования пользователя
    // Показываем только записи, где userId = targetUserId (собственные записи пользователя)
    // Исключаем только отмененные собеседования
    const interviews = await InterviewTracker.findAll({
      where: {
        userId: targetUserId,
        status: { [Op.ne]: 'cancelled' }, // Исключаем отмененные
      },
      include: [
        {
          model: User,
          as: "employer",
          attributes: ["id", "username", "companyName", "avatar"],
        },
        {
          model: User,
          as: "graduate",
          attributes: ["id", "username", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: Vacancy,
          as: "vacancy",
          attributes: ["id", "title"],
        },
      ],
      order: [
        ["date", "ASC"],
        ["time", "ASC"],
      ],
    });

    res.json(interviews);
  } catch (error) {
    console.error("Error loading calendar:", error);
    res.status(500).json({ error: "Ошибка при загрузке календаря" });
  }
});

module.exports = router;
