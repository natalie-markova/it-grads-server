const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаем директорию для загрузок если её нет
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const avatarDir = path.join(uploadDir, 'avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// Настройка хранилища для аватаров
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarDir);
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя файла
    // Используем req.userId (устанавливается authMiddleware) или req.user.id (устанавливается verifyToken)
    // Если ни один не доступен, используем случайное число (не должно происходить, но на всякий случай)
    const userId = req.userId || (req.user && req.user.id) || Math.round(Math.random() * 1E9);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar-${userId}-${uniqueSuffix}${ext}`);
  }
});

// Фильтр файлов - только изображения
const imageFilter = function(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Только файлы изображений разрешены'), false);
  }
  cb(null, true);
};

// Multer middleware для аватаров
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

module.exports = {
  uploadAvatar
};