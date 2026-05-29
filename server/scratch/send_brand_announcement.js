const nodemailer = require('nodemailer');
const dns = require('dns');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const resolveHost = async (host) => {
  if (/^[0-9.]+$/.test(host)) return host;
  try {
    const addresses = await dns.promises.resolve4(host);
    if (addresses && addresses.length > 0) {
      console.log(`Resolved SMTP host ${host} to IP: ${addresses[0]}`);
      return addresses[0];
    }
  } catch (err) {
    console.warn(`DNS resolution failed for ${host}. Using original.`, err);
  }
  return host;
};

async function send() {
  console.log('Preparing to send Clocked announcement email...');
  
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.error('ERROR: Missing SMTP environment variables.');
    process.exit(1);
  }

  const resolvedIp = await resolveHost(host);
  const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;

  const transporter = nodemailer.createTransport({
    host: resolvedIp,
    port,
    secure: isSecure,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    tls: {
      servername: host,
      rejectUnauthorized: false
    }
  });

  const subject = 'Important Update: Transitioning to "Clocked" ⏰ for Time Allocations';
  const to = 'mavericks@themavericksindia.com';
  
  // Custom sender name representing the brand new Clocked app!
  const from = `Clocked <${user}>`;

  const text = `Hello Everyone! 🤖

I am Clocked, your newly upgraded and blazing-fast time allocation portal. If you have been using the older tracking tool, please switch over to the new portal immediately using your official Google account to log in, for the month of April - May.

Link: https://mavs-tracker.vercel.app/

I am much faster and better than old time allocation sheet! 🤖 I will also remind you weekly about your allocations.
Please use me and for any concerns contact the tech team.

Kindly yours,
Clocked!!`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; padding: 12px; background-color: #eff6ff; border-radius: 50%; margin-bottom: 12px;">
          <span style="font-size: 32px;">⏰</span>
        </div>
        <h2 style="color: #1e3a8a; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">Important Update: Transitioning to "Clocked"</h2>
      </div>

      <p style="font-size: 15px; color: #334155; line-height: 1.6;">Hello Everyone! 🤖</p>
      
      <p style="font-size: 15px; color: #334155; line-height: 1.6;">
        I am <strong>Clocked</strong>, your newly upgraded and blazing-fast time allocation portal. If you have been using the older tracking tool, please switch over to the new portal immediately using your official Google account to log in, for the month of April - May.
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="https://mavs-tracker.vercel.app/" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
          Access Clocked Portal
        </a>
        <div style="margin-top: 8px;">
          <a href="https://mavs-tracker.vercel.app/" style="font-size: 12px; color: #64748b; text-decoration: underline;">https://mavs-tracker.vercel.app/</a>
        </div>
      </div>

      <p style="font-size: 15px; color: #334155; line-height: 1.6;">
        I am much faster and better than the old time allocation sheet! 🤖 I will also remind you weekly about your allocations.
      </p>
      
      <p style="font-size: 15px; color: #334155; line-height: 1.6;">
        Please use me and for any concerns contact the tech team.
      </p>

      <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        Kindly yours,<br>
        <strong style="color: #2563eb; font-size: 16px;">Clocked!!</strong>
      </p>

      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94a3b8; line-height: 1.4; text-align: center;">
        This is an automated system announcement from the Clocked Time Allocation registry.
      </p>
    </div>
  `;

  try {
    console.log(`Sending email to: ${to}...`);
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });
    console.log('SUCCESS! Email sent successfully. Message ID:', info.messageId);
  } catch (err) {
    console.error('FAILURE: Failed to send email:', err);
  }
}

send().catch(console.error);
