const express = require("express");
const router = express.Router();
const { InterviewTracker, User, Vacancy, Chat, Application } = require("../db/models");
const authMiddleware = require("../middleware/authMiddleware");
const { Op } = require("sequelize");

// ============= GRADUATE ROUTES =============

// GET /api/interview-tracker - Получить все собеседования текущего пользователя
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const interviews = await InterviewTracker.findAll({
      where: { userId },
      include: [
        {
          model: User,
          as: "employer",
          attributes: ["id", "username", "companyName", "avatar"],
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
      employerId: employerId || null,
      vacancyId: vacancyId || null,
      sharedWithEmployer: sharedWithEmployer || false,
    });

    res.status(201).json(interview);
  } catch (error) {
    console.error("Error creating interview:", error);
    res.status(500).json({ error: "Ошибка при создании собеседования" });
  }
});

// PUT /api/interview-tracker/:id - Обновить собеседование
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

    res.json(interview);
  } catch (error) {
    console.error("Error updating interview:", error);
    res.status(500).json({ error: "Ошибка при обновлении собеседования" });
  }
});

// PATCH /api/interview-tracker/:id/status - Изменить статус собеседования
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
    res.json(interview);
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: "Ошибка при обновлении статуса" });
  }
});

// PATCH /api/interview-tracker/:id/result - Установить результат собеседования
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
    res.json(interview);
  } catch (error) {
    console.error("Error updating result:", error);
    res.status(500).json({ error: "Ошибка при обновлении результата" });
  }
});

// DELETE /api/interview-tracker/:id - Удалить собеседование
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
    const interviews = await InterviewTracker.findAll({
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

    const interview = await InterviewTracker.findOne({
      where: { id, userId: employerId },
    });

    if (!interview) {
      return res.status(404).json({ error: "Собеседование не найдено" });
    }

    // Удаляем связанную запись выпускника (опционально - можно оставить как "отмененную")
    if (interview.linkedInterviewId) {
      const linkedInterview = await InterviewTracker.findByPk(interview.linkedInterviewId);
      if (linkedInterview) {
        await linkedInterview.update({
          status: "cancelled",
          notes: `${linkedInterview.notes || ""}\n\nСобеседование отменено работодателем`.trim(),
        });
      }
    }

    await interview.destroy();
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
      }
    }

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
      }
    }

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
