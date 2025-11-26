const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;
// const { ACCESS_TOKEN_SECRET } = process.env;

module.exports = function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ')
    ? hdr.slice(7)
    : req.cookies.accessToken;
  
  console.log('Token used for verification:', token);
  
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    req.userId = userId;
    
    return next();
  } catch {
    return res
      .status(401)
      .json({ message: 'Invalid token' });
  }
  
};