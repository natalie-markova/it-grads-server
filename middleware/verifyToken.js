const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;
const { User } = require('../db/models');

module.exports = async function verifyToken(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ')
    ? hdr.slice(7)
    : req.cookies.accessToken;

  if (!token) return res.status(401).json({ message: 'Не авторизован' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Получаем пользователя из базы данных, чтобы получить актуальную роль
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'role', 'email', 'username']
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }
    
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username
    };
    
    return next();
  } catch (error) {
    // Provide specific error message for expired tokens
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Токен истёк', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Неверный токен' });
  }
};
