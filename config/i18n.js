const path = require('path');
const fs = require('fs');

// Load translation files
const localesPath = path.join(__dirname, '../locales');

const translations = {
  ru: {},
  en: {}
};

// Load translations
try {
  translations.ru = JSON.parse(fs.readFileSync(path.join(localesPath, 'ru.json'), 'utf8'));
  translations.en = JSON.parse(fs.readFileSync(path.join(localesPath, 'en.json'), 'utf8'));
} catch (error) {
  console.error('Error loading translation files:', error.message);
}

/**
 * Get translation by key
 * @param {string} key - Translation key (e.g., 'auth.required')
 * @param {string} lang - Language code ('ru' or 'en')
 * @param {object} params - Interpolation params
 * @returns {string}
 */
function t(key, lang = 'ru', params = {}) {
  const keys = key.split('.');
  let value = translations[lang] || translations.ru;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to Russian if key not found
      value = translations.ru;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if not found
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Interpolation
  return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
    return params[param] !== undefined ? params[param] : match;
  });
}

/**
 * Extract language from request
 * @param {object} req - Express request object
 * @returns {string} - Language code
 */
function getLanguageFromRequest(req) {
  // 1. Check query parameter
  if (req.query.lang && ['ru', 'en'].includes(req.query.lang)) {
    return req.query.lang;
  }

  // 2. Check Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
    if (['ru', 'en'].includes(preferred)) {
      return preferred;
    }
  }

  // 3. Default to Russian
  return 'ru';
}

/**
 * i18n middleware - attaches t function to request
 */
function i18nMiddleware(req, res, next) {
  req.lang = getLanguageFromRequest(req);
  req.t = (key, params) => t(key, req.lang, params);
  next();
}

module.exports = {
  t,
  getLanguageFromRequest,
  i18nMiddleware,
  translations
};