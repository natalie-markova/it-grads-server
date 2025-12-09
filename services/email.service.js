const nodemailer = require('nodemailer');

// Создаем транспорт для Yandex SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

class EmailService {
  /**
   * Отправка письма с подтверждением email
   */
  async sendVerificationEmail(email, username, verificationToken) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

    const mailOptions = {
      from: {
        name: 'IT-Grads Platform',
        address: process.env.SMTP_USER,
      },
      to: email,
      subject: 'Подтвердите ваш email - IT-Grads',
      text: `
        Здравствуйте, ${username}!

        Спасибо за регистрацию на платформе IT-Grads.

        Для активации аккаунта перейдите по ссылке:
        ${verificationUrl}

        Ссылка действительна в течение 24 часов.

        Если вы не регистрировались на IT-Grads, просто проигнорируйте это письмо.

        С уважением,
        Команда IT-Grads
      `,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Добро пожаловать в IT-Grads!</h1>
            </div>
            <div class="content">
              <p>Здравствуйте, <strong>${username}</strong>!</p>

              <p>Спасибо за регистрацию на платформе IT-Grads. Мы рады видеть вас в нашем сообществе!</p>

              <p>Для активации аккаунта и получения полного доступа ко всем возможностям платформы, пожалуйста, подтвердите ваш email:</p>

              <center>
                <a href="${verificationUrl}" class="button">Подтвердить Email</a>
              </center>

              <p style="color: #666; font-size: 14px;">Или скопируйте и вставьте эту ссылку в браузер:<br>
              <a href="${verificationUrl}">${verificationUrl}</a></p>

              <p style="color: #e74c3c; font-size: 14px;"><strong>Внимание:</strong> Ссылка действительна в течение 24 часов.</p>

              <p>Если вы не регистрировались на IT-Grads, просто проигнорируйте это письмо.</p>
            </div>
            <div class="footer">
              <p>© 2024 IT-Grads Platform. Все права защищены.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[OK] Verification email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('[ERROR] Email sending error:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Отправка уведомления об успешной верификации
   */
  async sendWelcomeEmail(email, username) {
    const mailOptions = {
      from: {
        name: 'IT-Grads Platform',
        address: process.env.SMTP_USER,
      },
      to: email,
      subject: 'Email успешно подтвержден - IT-Grads',
      text: `
        Здравствуйте, ${username}!

        Ваш email успешно подтвержден!

        Теперь вам доступны все возможности платформы IT-Grads:
        - AI Interview для подготовки к собеседованиям
        - Code Battle Arena для развития навыков
        - Создание резюме и отклики на вакансии
        - И многое другое!

        Желаем успехов в поиске работы!

        С уважением,
        Команда IT-Grads
      `,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .feature { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email подтвержден!</h1>
            </div>
            <div class="content">
              <p>Здравствуйте, <strong>${username}</strong>!</p>

              <p>Ваш email успешно подтвержден! Теперь вам доступны все возможности платформы IT-Grads:</p>

              <div class="feature">
                <strong>AI Interview</strong><br>
                Автоматические интервью для подготовки к собеседованиям
              </div>

              <div class="feature">
                <strong>Code Battle Arena</strong><br>
                PvP соревнования по решению алгоритмических задач
              </div>

              <div class="feature">
                <strong>Resume & Skills Radar</strong><br>
                Создание резюме с визуализацией навыков
              </div>

              <div class="feature">
                <strong>Вакансии</strong><br>
                Поиск и отклик на вакансии от реальных работодателей
              </div>

              <p style="margin-top: 30px;">Желаем успехов в развитии карьеры!</p>
            </div>
            <div class="footer">
              <p>© 2024 IT-Grads Platform. Все права защищены.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[OK] Welcome email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('[ERROR] Email sending error:', error);
      // Не бросаем ошибку, т.к. welcome email не критичен
      return { success: false };
    }
  }

  /**
   * Отправка письма для сброса пароля
   */
  async sendPasswordResetEmail(email, username, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: {
        name: 'IT-Grads Platform',
        address: process.env.SMTP_USER,
      },
      to: email,
      subject: 'Восстановление пароля - IT-Grads',
      text: `
        Здравствуйте, ${username}!

        Вы запросили восстановление пароля для вашего аккаунта на платформе IT-Grads.

        Для установки нового пароля перейдите по ссылке:
        ${resetUrl}

        Ссылка действительна в течение 1 часа.

        Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.

        С уважением,
        Команда IT-Grads
      `,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Восстановление пароля</h1>
            </div>
            <div class="content">
              <p>Здравствуйте, <strong>${username}</strong>!</p>

              <p>Вы запросили восстановление пароля для вашего аккаунта на платформе IT-Grads.</p>

              <p>Для установки нового пароля нажмите на кнопку ниже:</p>

              <center>
                <a href="${resetUrl}" class="button">Восстановить пароль</a>
              </center>

              <p style="color: #666; font-size: 14px;">Или скопируйте и вставьте эту ссылку в браузер:<br>
              <a href="${resetUrl}">${resetUrl}</a></p>

              <p style="color: #e74c3c; font-size: 14px;"><strong>Внимание:</strong> Ссылка действительна в течение 1 часа.</p>

              <div class="warning">
                <strong>Если вы не запрашивали восстановление пароля</strong>, просто проигнорируйте это письмо. Ваш пароль останется без изменений.
              </div>
            </div>
            <div class="footer">
              <p>© 2024 IT-Grads Platform. Все права защищены.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[OK] Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('[ERROR] Email sending error:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

module.exports = new EmailService();
