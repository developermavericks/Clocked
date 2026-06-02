import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase';
import dns from 'dns';

// Executive / CEO CC Emails
const CEO_EMAILS = [
  'chetan@themavericksindia.com',
  'archana@themavericksindia.com',
  'mitali.p@themavericksindia.com',
  'smriti@themavericksindia.com'
];

let transporterInstance: nodemailer.Transporter | null = null;

const resolveHost = async (host: string): Promise<string> => {
  // If it's already an IP address, return it
  if (/^[0-9.]+$/.test(host)) return host;
  
  try {
    const addresses = await dns.promises.resolve4(host);
    if (addresses && addresses.length > 0) {
      console.log(`[EMAIL] Resolved SMTP host ${host} to IPv4: ${addresses[0]}`);
      return addresses[0];
    }
  } catch (err) {
    console.warn(`[EMAIL] DNS resolution for ${host} failed. Using original hostname.`, err);
  }
  return host;
};

const getTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[EMAIL] SMTP_HOST, SMTP_USER, or SMTP_PASS is not defined in environment variables. Email service is running in mock/logging mode.');
    return null;
  }

  if (!transporterInstance) {
    const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;
    const resolvedIp = await resolveHost(host);

    transporterInstance = nodemailer.createTransport({
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      host: resolvedIp,
      port,
      secure: isSecure,
      auth: {
        user,
        pass
      },
      // Increase timeouts to be extra robust
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      tls: {
        // Enforce servername matching the original hostname for SSL validation!
        servername: host,
        rejectUnauthorized: false
      }
    } as any);
  }

  return transporterInstance;
};

export const formatMonthName = (monthStr: string) => {
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return monthStr;
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

// Helper sleep to introduce delays between emails
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends a reminder email to a single employee
 */
export const sendReminderEmail = async (
  email: string, 
  name: string, 
  monthStr: string,
  isClosureWarning: boolean = false
) => {
  const transporter = await getTransporter();
  const monthName = formatMonthName(monthStr);
  const employeeName = name || email.split('@')[0];

  const subject = isClosureWarning
    ? `Action Required: Final Clocked Closure Notice for ${monthName}`
    : `Action Required: Clocked Submission Reminder for ${monthName}`;

  const html = isClosureWarning
    ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #ea580c; border-radius: 16px; background-color: #fffaf8;">
        <h2 style="color: #ea580c; margin-top: 0; margin-bottom: 20px;">🚨 Final Closure Notice</h2>
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>This is a reminder that you have <strong>0 logged working hours</strong> in Clocked for the month of <strong>${monthName}</strong>.</p>
        <p>Please submit your time allocations immediately. May entries will be officially closed and locked on the <strong>5th of June</strong>.</p>
        <p style="font-weight: bold; color: #ea580c; margin-top: 15px; margin-bottom: 15px;">
          ⚠️ Note: You can ignore this message if you are an intern.
        </p>
        <p style="margin-top: 30px; margin-bottom: 30px;">
          <a href="${process.env.CLIENT_URL || 'https://mavs-tracker.vercel.app/'}" 
             style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
            Submit Logs Immediately
          </a>
        </p>
        <hr style="border: 0; border-top: 1px solid #fed7aa; margin: 30px 0;" />
        <p style="font-size: 11px; color: #c2410c; line-height: 1.4;">Note: The executive leadership team has been copied on this final closure notice.</p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #ea580c; margin-top: 0; margin-bottom: 20px;">Clocked Reminder</h2>
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>This is a reminder that you have <strong>0 logged working hours</strong> in Clocked for the month of <strong>${monthName}</strong>.</p>
        <p>Please log your entries as soon as possible. May entries will be officially closed on the <strong>5th of June</strong>.</p>
        <p style="font-weight: bold; color: #ea580c; margin-top: 15px; margin-bottom: 15px;">
          ⚠️ Note: You can ignore this message if you are an intern.
        </p>
        <p style="margin-top: 30px; margin-bottom: 30px;">
          <a href="${process.env.CLIENT_URL || 'https://mavs-tracker.vercel.app/'}" 
             style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
            Go to Clocked
          </a>
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #64748b;">This is an automated notification. If you have already logged your hours or have questions, please reach out to your manager.</p>
      </div>
    `;

  const fromEmail = process.env.SMTP_FROM || 'Clocked <notifications@themavericksindia.com>';

  // Weekly reminders (isClosureWarning = false) have NO CC.
  // Closure warnings have the 4 executive emails in CC.
  const ccString = isClosureWarning ? CEO_EMAILS.join(', ') : undefined;

  if (!transporter) {
    console.log(`[EMAIL-MOCK] Reminder sent via SMTP to: ${email} (isClosureWarning: ${isClosureWarning}, CC: ${ccString || 'None'}) for ${monthName}.`);
    return { success: true, mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: email,
      ...(ccString ? { cc: ccString } : {}),
      subject: subject,
      html: html,
    });
    console.log(`[EMAIL] Reminder email successfully sent to ${email} (isClosureWarning: ${isClosureWarning}, CC: ${ccString || 'None'})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EMAIL-ERROR] Failed to send reminder email to ${email}:`, error);
    throw error;
  }
};

/**
 * Sends reminder emails in batches smoothly with a small delay to avoid rate-limiting
 */
export const sendBulkReminderEmails = async (
  members: { email: string, name: string }[], 
  monthStr: string,
  isClosureWarning: boolean = false
) => {
  console.log(`[EMAIL] Starting bulk SMTP reminder dispatch for ${members.length} zero-hour members for ${monthStr} (isClosureWarning: ${isClosureWarning})`);
  
  // Ensure uniqueness in emails to prevent duplicate dispatch
  const uniqueMembers = Array.from(new Map(members.map(m => [m.email.toLowerCase(), m])).values());
  const results = [];

  for (const member of uniqueMembers) {
    try {
      const res = await sendReminderEmail(member.email, member.name, monthStr, isClosureWarning);
      results.push({ email: member.email, success: true, details: res });
    } catch (err: any) {
      results.push({ email: member.email, success: false, error: err.message });
    }
    // Smooth delay between dispatches (300ms)
    await sleep(300);
  }

  return results;
};

/**
 * Sends a thank-you acknowledgment email upon logging time
 */
export const sendAcknowledgmentEmail = async (userId: string, monthStr: string) => {
  const transporter = await getTransporter();
  const monthName = formatMonthName(monthStr);

  try {
    // 1. Fetch employee details from DB
    const { data: user, error } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      console.warn(`[EMAIL] Could not fetch user details for acknowledgment email. User ID: ${userId}`);
      return;
    }

    const email = user.email;
    const employeeName = user.name || email.split('@')[0];
    const subject = `Thank You for Your Clocked Submission - ${monthName}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #10b981; margin-bottom: 20px;">Submission Received!</h2>
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>Thank you for logging your time allocation actuals in Clocked for the month of <strong>${monthName}</strong>.</p>
        <p>Your submission has been successfully received and logged into the tracking registry.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #64748b;">This is an automated acknowledgment. Thank you for keeping your tracker up to date!</p>
      </div>
    `;

    const fromEmail = process.env.SMTP_FROM || 'Clocked <notifications@themavericksindia.com>';

    if (!transporter) {
      console.log(`[EMAIL-MOCK] Acknowledgment email sent via SMTP to: ${email} for ${monthName}. (No CEO in CC)`);
      return { success: true, mock: true };
    }

    const info = await transporter.sendMail({
      from: fromEmail,
      to: email,
      // For acknowledgment emails, do not include any CEO in CC
      subject: subject,
      html: html,
    });
    console.log(`[EMAIL] Acknowledgment email successfully sent via SMTP to ${email}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EMAIL-ERROR] Failed to send SMTP acknowledgment email for user ${userId}:`, error);
  }
};
