const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../db/models');
const checkUserIdMatches = require('../middleware/checkUserIdMatches');
const { cacheMiddleware, invalidateCache } = require('../middleware/cacheMiddleware');
const { uploadAvatar } = require('../middleware/upload');
const { User } = db;

const router = express.Router();

// Единый формат ответа для профиля
const getUserProfile = async (userId) => {
  return await User.findByPk(userId, {
    attributes: [
      'id', 'username', 'email', 'role', 'phone', 'avatar', 'createdAt',
      // Employer fields
      'companyName', 'companyDescription', 'companyWebsite', 'companyAddress', 'companySize', 'industry',
      // Graduate profile fields
      'photo', 'lastName', 'firstName', 'middleName', 'birthDate', 'city',
      'education', 'experience', 'about', 'github', 'linkedin', 'portfolio', 'skills', 'projects'
    ]
  });
};

// Профиль текущего пользователя
router.get('/profile', authMiddleware, cacheMiddleware(600), async (req, res) => {
  try {
    const user = await getUserProfile(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (e) {
    console.error('Profile error:', e);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Публичный профиль работодателя
router.get('/employer/:id', cacheMiddleware(600), async (req, res) => {
  try {
    const employerId = Number(req.params.id);
    if (isNaN(employerId)) {
      return res.status(400).json({ message: 'Неверный id работодателя' });
    }

    const employer = await User.findOne({
      where: {
        id: employerId,
        role: 'employer'
      },
      attributes: [
        'id', 'username', 'email', 'phone', 'avatar', 'createdAt',
        'companyName', 'companyDescription', 'companyWebsite', 'companyAddress', 'companySize', 'industry'
      ]
    });

    if (!employer) {
      return res.status(404).json({ message: 'Работодатель не найден' });
    }

    res.json(employer);
  } catch (e) {
    console.error('Employer profile error:', e);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Просмотр любого профиля (с проверкой прав)
router.get('/:id', authMiddleware, checkUserIdMatches, cacheMiddleware(600), async (req, res) => {
  try {
    const requestedUserId = Number(req.params.id);
    if (isNaN(requestedUserId)) {
      return res.status(400).json({ message: 'Неверный id пользователя' });
    }

    // Проверяем, что запрашиваемый id совпадает с текущим id из токена
    if (requestedUserId !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await getUserProfile(requestedUserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (e) {
    console.error('Profile error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.update(req.body);

    // Инвалидируем кэш профиля при обновлении
    await invalidateCache(`cache:/api/users/*`);

    res.json(await getUserProfile(req.userId));
  } catch (e) {
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// POST /api/user/upload-avatar - Загрузка аватара
router.post('/upload-avatar', authMiddleware, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не был загружен' });
    }

    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Сохраняем путь к файлу в БД
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await user.update({ avatar: avatarUrl });

    // Инвалидируем кэш профиля
    await invalidateCache(`cache:/api/users/*`);

    res.json({
      message: 'Аватар успешно загружен',
      avatar: avatarUrl
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Ошибка при загрузке аватара' });
  }
});

// DELETE /api/user/profile - Удаление профиля
router.delete('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await user.destroy();

    // Инвалидируем кэш
    await invalidateCache(`cache:/api/users/*`);

    res.json({ message: 'Профиль успешно удален' });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ error: 'Ошибка при удалении профиля' });
  }
});

module.exports = router;