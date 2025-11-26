require('dotenv').config();
const express      = require('express');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const db           = require('./db/models');
const authRoutes   = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const cookieRoutes = require('./routes/cookie.routes');


const PORT = process.env.PORT || 5001;
const app  = express();

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://192.168.0.3:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET','POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// API routes для фронтенда (совместимость)
app.use('/api/users', authRoutes); // /api/users/register, /api/users/login, /api/users/logout
app.use('/api/tokens', authRoutes); // /api/tokens/refresh
app.use('/api/user', userRoutes);

// Старые routes (для обратной совместимости)
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/cookies', cookieRoutes);


(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✔  PostgreSQL connected');
    app.listen(PORT, () => console.log(`🚀  Server on :${PORT}`));
  } catch (err) {
    console.error('✖  DB connection error:', err);
  }
})();
