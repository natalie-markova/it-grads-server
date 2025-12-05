const express = require("express");
const router = express.Router();
const { InterviewTracker, User, Vacancy, Chat, Application } = require("../db/models");
const authMiddleware = require("../middleware/authMiddleware");
const { Op } = require("sequelize");

// Функция для отправки WebSocket событий
const emitInterviewUpdate = (req, eventType, interview, targetUserId = null) => {
  const io = req.app.get("io");
  if (!io) return;

  const userId = req.userId;
  const sentToUsers = new Set(); // Отслеживаем, кому уже отправлено событие
  
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
            const io = req.app.get("io");
            if (io) {
              io.to(`user-${linkedUserId}`).emit("interview-tracker:update", {
                type: "deleted",
                interview: linkedInterview,
              });
            }
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
          const io = req.app.get("io");
          if (io) {
            io.to(`user-${gradUserId}`).emit("interview-tracker:update", {
              type: "deleted",
              interview: fullGradInterview,
            });
          }
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

module.exports = router;
