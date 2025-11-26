const express = require('express');
const router  = express.Router();

router.get('/set', (req, res) => {
  res.cookie('sessionId', 'abc123');
  res.send('Session cookie set');
});

router.get('/get', (req, res) => res.json(req.cookies));

router.get('/delete', (req, res) => {
  ['sessionId', 'theme', 'authToken'].forEach((c) => res.clearCookie(c));
  res.send('All cookies deleted!');
});

module.exports = router;
