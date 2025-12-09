require('dotenv').config();
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function testSendGrid() {
  console.log('=== Testing SendGrid Configuration ===\n');

  console.log('API Key:', process.env.SENDGRID_API_KEY ? 'Set (' + process.env.SENDGRID_API_KEY.substring(0, 10) + '...)' : 'NOT SET');
  console.log('From Email:', process.env.SENDGRID_FROM_EMAIL);
  console.log('From Name:', process.env.SENDGRID_FROM_NAME);
  console.log('Client URL:', process.env.CLIENT_URL);
  console.log('\n=== Attempting to send test email ===\n');

  const msg = {
    to: 's1993sa@yandex.ru',
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: process.env.SENDGRID_FROM_NAME,
    },
    subject: 'SendGrid Test - IT-Grads',
    text: 'This is a test email from IT-Grads platform.',
    html: '<p>This is a test email from IT-Grads platform.</p>',
  };

  try {
    const response = await sgMail.send(msg);
    console.log('[SUCCESS] Email sent successfully!');
    console.log('Response status:', response[0].statusCode);
    console.log('Response headers:', response[0].headers);
  } catch (error) {
    console.error('[ERROR] Failed to send email');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    if (error.response) {
      console.error('\n=== SendGrid Response Details ===');
      console.error('Status:', error.response.status);
      console.error('Body:', JSON.stringify(error.response.body, null, 2));
    }
  }
}

testSendGrid();
