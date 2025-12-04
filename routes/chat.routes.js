const express = require('express');
const router = express.Router();
const db = require('../db/models');
const { Chat, Message, User } = db;
const verifyToken = require('../middleware/verifyToken');
const { i18nMiddleware } = require('../config/i18n');

// Apply i18n middleware to all routes
router.use(i18nMiddleware);

// GET /api/chats - Получить все чаты пользователя
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'user1',
          attributes: ['id', 'username', 'email', 'avatar', 'role']
        },
        {
          model: User,
          as: 'user2',
          attributes: ['id', 'username', 'email', 'avatar', 'role']
        },
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']],
          separate: true
        }
      ],
      order: [['lastMessageAt', 'DESC']]
    });

    // Подсчет непрочитанных сообщений для каждого чата
    const chatsWithUnread = await Promise.all(chats.map(async (chat) => {
      const unreadCount = await Message.count({
        where: {
          chatId: chat.id,
          senderId: { [db.Sequelize.Op.ne]: userId },
          isRead: false
        }
      });

      return {
        ...chat.toJSON(),
        unreadCount
      };
    }));

    res.json(chatsWithUnread);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ message: req.t('chat.fetchError') });
  }
});

// GET /api/chats/:id - Получить конкретный чат с сообщениями
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const chat = await Chat.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user1',
          attributes: ['id', 'username', 'email', 'avatar', 'role']
        },
        {
          model: User,
          as: 'user2',
          attributes: ['id', 'username', 'email', 'avatar', 'role']
        },
        {
          model: Message,
          as: 'messages',
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'avatar']
          }]
        }
      ],
      order: [[{ model: Message, as: 'messages' }, 'createdAt', 'ASC']]
    });

    if (!chat) {
      return res.status(404).json({ message: req.t('chat.notFound') });
    }

    // Проверка доступа
    if (chat.user1Id !== req.user.id && chat.user2Id !== req.user.id) {
      return res.status(403).json({ message: req.t('chat.accessDenied') });
    }

    res.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ message: req.t('chat.fetchError') });
  }
});

// POST /api/chats - Создать или найти существующий чат
router.post('/', verifyToken, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.user.id;

    if (!otherUserId) {
      return res.status(400).json({ message: req.t('chat.noOtherUserId') });
    }

    if (userId === otherUserId) {
      return res.status(400).json({ message: req.t('chat.cannotChatWithSelf') });
    }

    // Проверяем, существует ли уже чат между этими пользователями
    let chat = await Chat.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { user1Id: userId, user2Id: otherUserId },
          { user1Id: otherUserId, user2Id: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'user1',
          attributes: ['id', 'username', 'email', 'avatar', 'role']
        },
        {
          model: User,
          as: 'user2',
          attributes: ['id', 'username', 'email', 'avatar', 'role']
        }
      ]
    });

    // Если чата нет, создаем новый
    if (!chat) {
      chat = await Chat.create({
        user1Id: userId,
        user2Id: otherUserId,
        lastMessageAt: new Date()
      });

      // Загружаем созданный чат с пользователями
      chat = await Chat.findByPk(chat.id, {
        include: [
          {
            model: User,
            as: 'user1',
            attributes: ['id', 'username', 'email', 'avatar', 'role']
          },
          {
            model: User,
            as: 'user2',
            attributes: ['id', 'username', 'email', 'avatar', 'role']
          }
        ]
      });
    }

    res.status(201).json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ message: req.t('chat.createError') });
  }
});

// POST /api/chats/:id/messages - Отправить сообщение в чат
router.post('/:id/messages', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    const chatId = req.params.id;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: req.t('chat.emptyMessage') });
    }

    const chat = await Chat.findByPk(chatId);

    if (!chat) {
      return res.status(404).json({ message: req.t('chat.notFound') });
    }

    // Проверка доступа
    if (chat.user1Id !== userId && chat.user2Id !== userId) {
      return res.status(403).json({ message: req.t('chat.accessDenied') });
    }

    const message = await Message.create({
      chatId,
      senderId: userId,
      content: content.trim(),
      isRead: false
    });

    // Обновляем время последнего сообщения в чате
    await chat.update({ lastMessageAt: new Date() });

    // Загружаем сообщение с информацией об отправителе
    const messageWithSender = await Message.findByPk(message.id, {
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.status(201).json(messageWithSender);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: req.t('chat.messageError') });
  }
});

// PUT /api/chats/:id/read - Отметить все сообщения в чате как прочитанные
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const chatId = req.params.id;
    const userId = req.user.id;

    const chat = await Chat.findByPk(chatId);

    if (!chat) {
      return res.status(404).json({ message: req.t('chat.notFound') });
    }

    // Проверка доступа
    if (chat.user1Id !== userId && chat.user2Id !== userId) {
      return res.status(403).json({ message: req.t('chat.accessDenied') });
    }

    // Отмечаем все сообщения от другого пользователя как прочитанные
    await Message.update(
      { isRead: true },
      {
        where: {
          chatId,
          senderId: { [db.Sequelize.Op.ne]: userId },
          isRead: false
        }
      }
    );

    // Отправить уведомление через WebSocket текущему пользователю
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${userId}`).emit('messages-read', { chatId });
    }

    res.json({ message: req.t('chat.messagesMarkedRead') });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: req.t('chat.statusUpdateError') });
  }
});

// GET /api/chats/unread/count - Получить общее количество непрочитанных сообщений
router.get('/unread/count', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Получаем все чаты пользователя
    const chats = await Chat.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      attributes: ['id']
    });

    const chatIds = chats.map(chat => chat.id);

    // Подсчитываем все непрочитанные сообщения
    const unreadCount = await Message.count({
      where: {
        chatId: { [db.Sequelize.Op.in]: chatIds },
        senderId: { [db.Sequelize.Op.ne]: userId },
        isRead: false
      }
    });

    // Получаем последние непрочитанные сообщения с информацией о чатах
    const unreadMessages = await Message.findAll({
      where: {
        chatId: { [db.Sequelize.Op.in]: chatIds },
        senderId: { [db.Sequelize.Op.ne]: userId },
        isRead: false
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Chat,
          as: 'chat',
          attributes: ['id', 'user1Id', 'user2Id']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      unreadCount,
      unreadMessages
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: req.t('chat.unreadCountError') });
  }
});

// DELETE /api/chats/:id - Удалить чат
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const chatId = req.params.id;
    const userId = req.user.id;

    const chat = await Chat.findByPk(chatId);

    if (!chat) {
      return res.status(404).json({ message: req.t('chat.notFound') });
    }

    // Проверка доступа
    if (chat.user1Id !== userId && chat.user2Id !== userId) {
      return res.status(403).json({ message: req.t('chat.accessDenied') });
    }

    // Удаляем все сообщения в чате
    await Message.destroy({
      where: { chatId }
    });

    // Удаляем сам чат
    await chat.destroy();

    res.json({ message: req.t('chat.deleted') });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ message: req.t('chat.deleteError') });
  }
});

module.exports = router;
