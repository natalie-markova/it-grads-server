const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const generate = require('../utils/generateToken');
const { User } = require('../db/models');
const verifyToken = require('../middleware/verifyToken');
const crypto = require('crypto');
const emailService = require('../services/email.service');

const router = express.Router();

const validRoles = ['graduate', 'employer'];

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: req.t('auth.allFieldsRequired') });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: req.t('auth.invalidRole') });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: req.t('auth.emailExists') });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role
    });

    // Генерация verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

    // Сохранение токена в БД
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    user.emailVerified = false;
    await user.save();

    // Отправка email
    try {
      await emailService.sendVerificationEmail(user.email, user.username, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Продолжаем регистрацию даже если email не отправился
    }

    const { accessToken, refreshToken } = generate(user.id);

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .status(201)
      .json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        }
      });
      
  } catch (e) {
    console.error('register:', e);
    res.status(500).json({ error: req.t('auth.registrationError') });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: req.t('auth.emailPasswordRequired') });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: req.t('auth.invalidCredentials') });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: req.t('auth.invalidCredentials') });
    }

    const { accessToken, refreshToken } = generate(user.id);

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        }
      });
  } catch (e) {
    console.error('login:', e);
    res.status(500).json({ error: req.t('auth.loginError') });
  }
});

const refreshHandler = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: req.t('auth.refreshTokenMissing') });
  }

  try {
    const { userId } = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const { accessToken, refreshToken: newRefresh } = generate(userId);

    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'role', 'emailVerified']
    });

    if (!user) {
      return res.status(401).json({ message: req.t('auth.userNotFound') });
    }

    res
      .cookie('refreshToken', newRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        }
      });
  } catch (e) {
    return res.status(401).json({ message: req.t('auth.invalidRefreshToken') });
  }
};

router.post('/refresh', refreshHandler);
router.get('/refresh', refreshHandler);

const logoutHandler = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  res.json({ message: 'OK' });
};

router.post('/logout', logoutHandler);
router.get('/logout', logoutHandler);

router.get('/roles', (req, res) => {
  res.json({ roles: validRoles });
});

// Алиас для совместимости с фронтендом
router.post('/registration', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: req.t('auth.allFieldsRequired') });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: req.t('auth.invalidRole') });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: req.t('auth.emailExists') });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role
    });

    // Генерация verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

    // Сохранение токена в БД
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    user.emailVerified = false;
    await user.save();

    // Отправка email
    try {
      await emailService.sendVerificationEmail(user.email, user.username, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Продолжаем регистрацию даже если email не отправился
    }

    // DEV: Логирование verification URL для тестирования
    if (process.env.NODE_ENV !== 'production') {
      const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
      console.log('\n========================================');
      console.log('VERIFICATION URL (for testing):');
      console.log(verificationUrl);
      console.log('========================================\n');
    }

    const { accessToken, refreshToken } = generate(user.id);

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        }
      });
  } catch (e) {
    console.error('registration:', e);
    res.status(500).json({ error: req.t('auth.registrationError') });
  }
});

// PUT /api/auth/change-password - Смена пароля
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: req.t('auth.currentPasswordRequired') });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: req.t('auth.passwordMinLength') });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: req.t('auth.userNotFound') });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: req.t('auth.invalidCurrentPassword') });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update({ password: hashedPassword });

    res.json({ message: req.t('auth.passwordChanged') });
  } catch (e) {
    console.error('change-password:', e);
    res.status(500).json({ error: req.t('auth.passwordChangeError') });
  }
});

// GET /api/auth/verify-email/:token - Верификация email по токену
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      where: {
        emailVerificationToken: token
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Токен верификации не найден или уже использован' });
    }

    // Проверка срока действия токена
    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({ error: 'Срок действия токена истёк. Запросите новое письмо.' });
    }

    // Верификация email
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Отправка welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.username);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Не критично, продолжаем
    }

    res.json({ 
      message: 'Email успешно подтверждён!',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (e) {
    console.error('verify-email:', e);
    res.status(500).json({ error: 'Ошибка при верификации email' });
  }
});

// POST /api/auth/resend-verification - Переотправка письма с верификацией
router.post('/resend-verification', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email уже подтверждён' });
    }

    // Генерация нового токена
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Отправка email
    await emailService.sendVerificationEmail(user.email, user.username, verificationToken);

    res.json({ message: 'Письмо с подтверждением отправлено повторно' });
  } catch (e) {
    console.error('resend-verification:', e);
    res.status(500).json({ error: 'Ошибка при отправке письма' });
  }
});

// POST /api/auth/forgot-password - Запрос на восстановление пароля
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Не раскрываем, существует ли пользователь
      return res.json({ message: 'Если email существует, письмо с инструкциями отправлено' });
    }

    // Генерация токена сброса пароля (1 час действия)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 час

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Отправка email
    try {
      await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({ error: 'Не удалось отправить письмо' });
    }

    // Dev-режим: логируем ссылку для тестирования
    if (process.env.NODE_ENV !== 'production') {
      const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
      console.log('\n========================================');
      console.log('PASSWORD RESET URL (for testing):');
      console.log(resetUrl);
      console.log('========================================\n');
    }

    res.json({ message: 'Если email существует, письмо с инструкциями отправлено' });
  } catch (e) {
    console.error('forgot-password:', e);
    res.status(500).json({ error: 'Ошибка при восстановлении пароля' });
  }
});

// POST /api/auth/reset-password/:token - Установка нового пароля
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Недействительная или истёкшая ссылка для сброса пароля' });
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;

    // Очищаем токен сброса
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await user.save();

    res.json({ message: 'Пароль успешно изменён. Теперь вы можете войти с новым паролем.' });
  } catch (e) {
    console.error('reset-password:', e);
    res.status(500).json({ error: 'Ошибка при сбросе пароля' });
  }
});

module.exports = router;