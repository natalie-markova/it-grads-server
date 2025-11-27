// Load environment variables
const fs = require('fs');
const path = require('path');
if (fs.existsSync(path.join(__dirname, '.env.local'))) {
  require('dotenv').config({ path: path.join(__dirname, '.env.local') });
  console.log('📝 Loaded .env.local');
} else {
  require('dotenv').config();
  console.log('📝 Loaded .env');
}

const express      = require('express');
const https        = require('https');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const db = require('./db/models');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const cookieRoutes = require('./routes/cookie.routes');



const PORT = process.env.PORT || 5001;
const app  = express();

// SSL configuration for local development
const sslPath = path.join(__dirname, '../../ssl');
let httpsOptions = null;

if (fs.existsSync(path.join(sslPath, 'cert.pem')) && fs.existsSync(path.join(sslPath, 'key.pem'))) {
  httpsOptions = {
    key: fs.readFileSync(path.join(sslPath, 'key.pem')),
    cert: fs.readFileSync(path.join(sslPath, 'cert.pem'))
  };
  console.log('🔐 SSL certificates found - HTTPS enabled');
} else {
  console.log('⚠️  No SSL certificates found - Running on HTTP');
}

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'https://localhost:3000',
    'https://localhost:3001',
    'https://localhost:5173',
    'http://192.168.0.3:3000',
    'http://127.0.0.1:3000',
    'https://www.itgrads.ru',
    'https://itgrads.ru',
    'http://www.itgrads.ru',
    'http://itgrads.ru',
    'http://185.55.56.201'
  ],
  credentials: true,
  methods: ['GET','POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/api/users', authRoutes);
app.use('/api/tokens', authRoutes);
app.use('/api/user', userRoutes);

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/cookies', cookieRoutes);
app.use('/api/interviews', interviewRoutes);


(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✔  PostgreSQL connected');

    if (httpsOptions) {
      // Run HTTPS server
      https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`🚀  HTTPS Server on https://localhost:${PORT}`);
        console.log(`🔐  SSL enabled for local development`);
      });
    } else {
      // Fallback to HTTP
      app.listen(PORT, () => {
        console.log(`🚀  HTTP Server on http://localhost:${PORT}`);
      });
    }
  } catch (err) {
    console.error('✖  DB connection error:', err);
  }
})();
