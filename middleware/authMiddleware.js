const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;
// const { ACCESS_TOKEN_SECRET } = process.env;

module.exports = function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ')
    ? hdr.slice(7)
    : req.cookies.accessToken;

  console.log('Token used for verification:', token);
  console.log('JWT_SECRET exists:', !!JWT_SECRET);

  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', decoded);
    req.userId = decoded.userId;

    return next();
  } catch (error) {
    console.error('Token verification error:', error.message);

    // Provide specific error message for expired tokens
    if (error.name === 'TokenExpiredError') {
      return res
        .status(401)
        .json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }

    return res
      .status(401)
      .json({ message: 'Invalid token' });
  }

};