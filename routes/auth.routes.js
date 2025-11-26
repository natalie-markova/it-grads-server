const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const generate = require('../utils/generateToken');
const { User } = require('../db/models');

const router = express.Router();

const validRoles = ['graduate', 'employer'];

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Неверная роль пользователя' });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role
    });

    const { accessToken, refreshToken } = generate(user.id);

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .status(201)
      .json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
  } catch (e) {
    console.error('register:', e);
    res.status(500).json({ error: 'Произошла ошибка при регистрации' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const { accessToken, refreshToken } = generate(user.id);

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
  } catch (e) {
    console.error('login:', e);
    res.status(500).json({ error: 'Произошла ошибка при входе' });
  }
});

const refreshHandler = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: 'refreshToken doesnt exist' });
  }

  try {
    const { userId } = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const { accessToken, refreshToken: newRefresh } = generate(userId);

    // Получаем данные пользователя
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'role']
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res
      .cookie('refreshToken', newRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
  } catch (e) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
};

router.post('/refresh', refreshHandler);
router.get('/refresh', refreshHandler);

const logoutHandler = (req, res) => {
  res.clearCookie('refreshToken');
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
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Неверная роль пользователя' });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role
    });

    const { accessToken, refreshToken } = generate(user.id);

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
  } catch (e) {
    console.error('registration:', e);
    res.status(500).json({ error: 'Произошла ошибка при регистрации' });
  }
});

module.exports = router;