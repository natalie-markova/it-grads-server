/**
 * Yandex SpeechKit Text-to-Speech Service
 * Синтез речи с естественными голосами
 */

const axios = require('axios');

// Доступные голоса YandexSpeechKit
// Премиум голоса (более естественные)
const VOICES = {
  female: [
    { id: 'alena', name: 'Алёна', emotion: 'neutral' },
    { id: 'alena', name: 'Алёна (добрая)', emotion: 'good' },
    { id: 'jane', name: 'Джейн', emotion: 'neutral' },
    { id: 'jane', name: 'Джейн (добрая)', emotion: 'good' },
    { id: 'omazh', name: 'Омаж', emotion: 'neutral' },
    { id: 'marina', name: 'Марина', emotion: 'neutral' },
  ],
  male: [
    { id: 'filipp', name: 'Филипп', emotion: 'neutral' },
    { id: 'ermil', name: 'Ермил', emotion: 'neutral' },
    { id: 'ermil', name: 'Ермил (добрый)', emotion: 'good' },
    { id: 'madirus', name: 'Мадирус', emotion: 'neutral' },
    { id: 'alexander', name: 'Александр', emotion: 'neutral' },
    { id: 'kirill', name: 'Кирилл', emotion: 'neutral' },
  ]
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
   */
  getRandomVoice(gender = null) {
    const selectedGender = gender || (Math.random() > 0.5 ? 'female' : 'male');
    const voices = VOICES[selectedGender];
    const randomVoice = voices[Math.floor(Math.random() * voices.length)];
    return {
      ...randomVoice,
      gender: selectedGender
    };
  }

  /**
   * Синтезировать речь
   * @param {string} text - Текст для озвучки
   * @param {object} options - Опции синтеза
   * @returns {Promise<Buffer>} - Аудио данные в формате OGG
   */
  async synthesize(text, options = {}) {
    const voice = options.voice || this.getRandomVoice(options.gender);

    const params = new URLSearchParams({
      text: text,
      lang: 'ru-RU',
      voice: voice.id,
      emotion: voice.emotion || 'neutral',
      speed: options.speed || '1.0',
      format: 'oggopus', // Лучше для веба
      folderId: this.folderId
    });

    try {
      console.log('YandexTTS: Synthesizing text with voice:', voice.id);
      console.log('YandexTTS: API Key (first 10 chars):', this.apiKey?.substring(0, 10));
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

      console.log('YandexTTS: Success, audio size:', response.data.byteLength);

      return {
        audio: Buffer.from(response.data),
        voice: voice,
        format: 'audio/ogg'
      };
    } catch (error) {
      // Попробуем декодировать ошибку из arraybuffer
      let errorMessage = error.message;
      if (error.response?.data) {
        try {
          const errorText = Buffer.from(error.response.data).toString('utf-8');
          console.error('YandexTTS Error Response:', errorText);
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error_message || errorText;
        } catch (e) {
          console.error('YandexTTS Raw Error:', error.response.data);
        }
      }
      console.error('YandexTTS Error:', errorMessage);
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