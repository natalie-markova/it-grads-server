const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

module.exports = function verifyToken(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ')
    ? hdr.slice(7)
    : req.cookies.accessToken;

  if (!token) return res.status(401).json({ message: 'Не авторизован' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Неверный токен' });
  }
};
