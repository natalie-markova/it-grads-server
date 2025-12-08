/**
 * Yandex SpeechKit Text-to-Speech Service
 * Синтез речи с естественными голосами
 */

const axios = require('axios');

// Доступные голоса YandexSpeechKit (актуальные на 2025)
// https://yandex.cloud/docs/speechkit/tts/voices
const VOICES = {
  ru: {
    female: [
      { id: 'alena', name: 'Алёна', emotion: 'neutral' },
      { id: 'jane', name: 'Джейн', emotion: 'neutral' },
    ],
    male: [
      { id: 'filipp', name: 'Филипп', emotion: 'neutral' },
      { id: 'ermil', name: 'Ермил', emotion: 'neutral' },
      { id: 'zahar', name: 'Захар', emotion: 'neutral' },
    ]
  },
  en: {
    female: [
      { id: 'john', name: 'John', emotion: 'neutral' }, // en-US голос
    ],
    male: [
      { id: 'john', name: 'John', emotion: 'neutral' }, // en-US голос
    ]
  }
};

class YandexTTSService {
  constructor() {
    this.ttsUrl = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';
  }

  // Геттеры для динамического получения env переменных (после загрузки dotenv)
  get apiKey() {
    return process.env.YANDEX_SPEECHKIT_API_KEY || process.env.YANDEX_API_KEY;
  }

  get folderId() {
    // Используем отдельный folder ID для SpeechKit если указан
    return process.env.YANDEX_SPEECHKIT_FOLDER_ID || process.env.YANDEX_FOLDER_ID;
  }

  /**
   * Получить случайный голос
   * @param {string} gender - 'male' или 'female', если не указан - случайный
   * @param {string} lang - 'ru' или 'en', по умолчанию 'ru'
   */
  getRandomVoice(gender = null, lang = 'ru') {
    const selectedGender = gender || (Math.random() > 0.5 ? 'female' : 'male');
    const langVoices = VOICES[lang] || VOICES.ru;
    const voices = langVoices[selectedGender] || langVoices.male;
    const randomVoice = voices[Math.floor(Math.random() * voices.length)];
    return {
      ...randomVoice,
      gender: selectedGender,
      lang: lang
    };
  }

  /**
   * Синтезировать речь
   * @param {string} text - Текст для озвучки
   * @param {object} options - Опции синтеза
   * @returns {Promise<Buffer>} - Аудио данные
   */
  async synthesize(text, options = {}) {
    // Проверяем наличие API ключа
    if (!this.apiKey) {
      console.error('YandexTTS: API Key is not configured');
      throw new Error('TTS service not configured: missing API key');
    }

    if (!this.folderId) {
      console.error('YandexTTS: Folder ID is not configured');
      throw new Error('TTS service not configured: missing folder ID');
    }

    // Определяем язык для голоса
    const lang = options.lang || 'ru';
    const voice = options.voice || this.getRandomVoice(options.gender, lang);

    // Используем oggopus формат - поддерживается YandexSpeechKit и браузерами
    const mimeType = 'audio/ogg';

    // Язык для синтеза: ru-RU или en-US
    const ttsLang = lang === 'en' ? 'en-US' : 'ru-RU';

    const params = new URLSearchParams({
      text: text,
      lang: ttsLang,
      voice: voice.id,
      speed: options.speed || '1.0',
      format: 'oggopus',
      sampleRateHertz: '48000',
      folderId: this.folderId
    });

    try {
      console.log('YandexTTS: Synthesizing text with voice:', voice.id);
      console.log('YandexTTS: Text length:', text.length);
      console.log('YandexTTS: Folder ID:', this.folderId);

      const response = await axios.post(
        this.ttsUrl,
        params.toString(),
        {
          headers: {
            'Authorization': `Api-Key ${this.apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      console.log('YandexTTS: Success, audio size:', response.data.byteLength, 'bytes');

      return {
        audio: Buffer.from(response.data),
        voice: voice,
        format: mimeType
      };
    } catch (error) {
      // Детальная обработка ошибок
      let errorMessage = error.message;
      let statusCode = error.response?.status;

      if (error.response?.data) {
        try {
          const errorText = Buffer.from(error.response.data).toString('utf-8');
          console.error('YandexTTS Error Response:', errorText);
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error_message || errorText;
        } catch (e) {
          // Если не JSON, просто выводим как текст
          const errorText = Buffer.from(error.response.data).toString('utf-8');
          console.error('YandexTTS Raw Error:', errorText);
          errorMessage = errorText || error.message;
        }
      }

      console.error('YandexTTS Error (status:', statusCode, '):', errorMessage);

      // Добавляем информацию о статусе в ошибку
      if (statusCode === 401) {
        throw new Error('TTS authentication failed: invalid API key');
      } else if (statusCode === 403) {
        throw new Error('TTS access denied: check folder permissions');
      } else if (statusCode === 429) {
        throw new Error('TTS rate limit exceeded: try again later');
      }

      throw new Error('Failed to synthesize speech: ' + errorMessage);
    }
  }

  /**
   * Получить список доступных голосов
   */
  getAvailableVoices() {
    return VOICES;
  }
}

module.exports = new YandexTTSService();