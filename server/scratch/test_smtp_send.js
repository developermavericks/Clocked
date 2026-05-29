const { sendReminderEmail } = require('../src/services/emailService');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function test() {
  console.log('Testing SMTP connection and sending a test reminder...');
  console.log('SMTP Config check:');
  console.log('- Host:', process.env.SMTP_HOST);
  console.log('- Port:', process.env.SMTP_PORT);
  console.log('- User:', process.env.SMTP_USER);
  console.log('- Pass:', process.env.SMTP_PASS ? '******' : 'MISSING');
  console.log('- From:', process.env.SMTP_FROM);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('ERROR: Missing SMTP credentials in server/.env');
    process.exit(1);
  }

  try {
    const result = await sendReminderEmail(
      'developer@themavericksindia.com',
      'Mavs Developer',
      '2026-05'
    );
    console.log('\nSUCCESS! Test email sent successfully:', result);
  } catch (err) {
    console.error('\nFAILURE: Failed to send SMTP test email:', err);
  }
}

test().catch(console.error);
