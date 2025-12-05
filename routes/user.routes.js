const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../db/models');
const checkUserIdMatches = require('../middleware/checkUserIdMatches');
const { cacheMiddleware, invalidateCache } = require('../middleware/cacheMiddleware');
const { uploadAvatar } = require('../middleware/upload');
const { User } = db;

const router = express.Router();

// GET /api/users/count - Получить количество пользователей
router.get('/count', async (req, res) => {
  try {
    const count = await User.count();
    res.json({ count });
  } catch (error) {
    console.error('Error getting user count:', error);
    res.status(500).json({ message: req.t('user.fetchError') });
  }
});

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
      return res.status(404).json({ message: req.t('user.notFound') });
    }
    res.json(user);
  } catch (e) {
    console.error('Profile error:', e);
    res.status(500).json({ message: req.t('common.serverError') });
  }
});

// Публичный профиль работодателя
router.get('/employer/:id', cacheMiddleware(600), async (req, res) => {
  try {
    const employerId = Number(req.params.id);
    if (isNaN(employerId)) {
      return res.status(400).json({ message: req.t('common.badRequest') });
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
      return res.status(404).json({ message: req.t('user.notFound') });
    }

    res.json(employer);
  } catch (e) {
    console.error('Employer profile error:', e);
    res.status(500).json({ message: req.t('common.serverError') });
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

    // Инвалидируем кэш профиля при обновлении (роут /api/user, не /api/users)
    await invalidateCache(`cache:/api/user/*`);

    res.json(await getUserProfile(req.userId));
  } catch (e) {
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// POST /api/user/upload-avatar - Загрузка аватара
router.post('/upload-avatar', authMiddleware, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: req.t('common.badRequest') });
    }

    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ error: req.t('user.notFound') });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const updateData = { avatar: avatarUrl };

    if (user.role === 'graduate') {
      updateData.photo = avatarUrl;
    }

    await user.update(updateData);

    await invalidateCache(`cache:/api/user/*`);

    res.json({
      message: req.t('user.avatarUpdated'),
      avatar: avatarUrl,
      photo: user.role === 'graduate' ? avatarUrl : undefined
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: req.t('user.avatarError') });
  }
});

// POST /api/user/upload-photo - Загрузка фото для выпускника
router.post('/upload-photo', authMiddleware, (req, res, next) => {
  uploadAvatar.single('photo')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Размер файла превышает 5MB' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err.message === 'Только файлы изображений разрешены') {
        return res.status(400).json({ error: err.message });
      }
      console.error('Multer error:', err);
      return res.status(500).json({ error: 'Ошибка при загрузке файла' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не был загружен' });
    }

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Пользователь не авторизован' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Сохраняем путь к файлу в БД
    const photoUrl = `/uploads/avatars/${req.file.filename}`;
    // Обновляем photo для выпускников и avatar для работодателей
    if (user.role === 'graduate') {
      await user.update({ photo: photoUrl, avatar: photoUrl });
    } else if (user.role === 'employer') {
      await user.update({ avatar: photoUrl });
    }

    // Инвалидируем кэш профиля
    await invalidateCache(`cache:/api/user/*`);

    res.json({
      message: 'Фото успешно загружено',
      photo: photoUrl
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Ошибка при загрузке фото', details: error.message });
  }
});

// DELETE /api/user/profile - Удаление профиля
router.delete('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ error: req.t('user.notFound') });
    }

    await user.destroy();

    await invalidateCache(`cache:/api/user/*`);

    res.json({ message: req.t('user.profileUpdated') });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ error: req.t('user.deleteError') });
  }
});

module.exports = router;