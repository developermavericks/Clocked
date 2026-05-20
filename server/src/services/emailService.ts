import { Resend } from 'resend';
import { supabase } from '../config/supabase';

// Executive / CEO CC Emails
const CEO_EMAILS = [
  'archana@themavericksindia.com',
  'arunkumar@themavericksindia.com',
  'avinash@themavericksindia.com',
  'chetan@themavericksindia.com'
];

let resendInstance: Resend | null = null;

const getResendInstance = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[EMAIL] RESEND_API_KEY is not defined in environment variables. Email service is running in mock/logging mode.');
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
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
export const sendReminderEmail = async (email: string, name: string, monthStr: string) => {
  const resend = getResendInstance();
  const monthName = formatMonthName(monthStr);
  const employeeName = name || email.split('@')[0];

  const subject = `Action Required: MavsTracker Submission Reminder for ${monthName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 16px;">
      <h2 style="color: #ea580c; margin-bottom: 20px;">MavsTracker Reminder</h2>
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>This is a reminder that you have <strong>0 logged working hours</strong> in MavsTracker for the month of <strong>${monthName}</strong>.</p>
      <p>Please log your time allocation entries as soon as possible to ensure accurate monthly tracking.</p>
      <p style="margin-top: 30px;">
        <a href="${process.env.CLIENT_URL || 'https://mavstracker.themavericksindia.com'}" 
           style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
          Go to MavsTracker
        </a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 12px; color: #64748b;">This is an automated notification. If you have already logged your hours or have questions, please reach out to your manager.</p>
    </div>
  `;

  if (!resend) {
    console.log(`[EMAIL-MOCK] Reminder sent to: ${email} (CC: ${CEO_EMAILS.join(', ')}) for ${monthName}.`);
    return { success: true, mock: true };
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'MavsTracker <notifications@themavericksindia.com>';
    const data = await resend.emails.send({
      from: fromEmail,
      to: [email],
      cc: CEO_EMAILS,
      subject: subject,
      html: html,
    });
    console.log(`[EMAIL] Reminder email successfully sent to ${email} (CC: ${CEO_EMAILS.join(', ')})`);
    return { success: true, data };
  } catch (error: any) {
    console.error(`[EMAIL-ERROR] Failed to send reminder email to ${email}:`, error);
    throw error;
  }
};

/**
 * Sends reminder emails in batches smoothly with a small delay to avoid rate-limiting
 */
export const sendBulkReminderEmails = async (members: { email: string, name: string }[], monthStr: string) => {
  console.log(`[EMAIL] Starting bulk reminder dispatch for ${members.length} zero-hour members for ${monthStr}`);
  
  // Ensure uniqueness in emails to prevent duplicate dispatch
  const uniqueMembers = Array.from(new Map(members.map(m => [m.email.toLowerCase(), m])).values());
  const results = [];

  for (const member of uniqueMembers) {
    try {
      const res = await sendReminderEmail(member.email, member.name, monthStr);
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
  const resend = getResendInstance();
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
    const subject = `Thank You for Your MavsTracker Submission - ${monthName}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 16px;">
        <h2 style="color: #10b981; margin-bottom: 20px;">Submission Received!</h2>
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>Thank you for logging your time allocation actuals in MavsTracker for the month of <strong>${monthName}</strong>.</p>
        <p>Your submission has been successfully received and logged into the tracking registry.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #64748b;">This is an automated acknowledgment. Thank you for keeping your tracker up to date!</p>
      </div>
    `;

    if (!resend) {
      console.log(`[EMAIL-MOCK] Acknowledgment email sent to: ${email} for ${monthName}. (No CEO in CC)`);
      return { success: true, mock: true };
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'MavsTracker <notifications@themavericksindia.com>';
    const data = await resend.emails.send({
      from: fromEmail,
      to: [email],
      // For acknowledgment emails, do not include any CEO in CC
      subject: subject,
      html: html,
    });
    console.log(`[EMAIL] Acknowledgment email successfully sent to ${email}`);
    return { success: true, data };
  } catch (error: any) {
    console.error(`[EMAIL-ERROR] Failed to send acknowledgment email for user ${userId}:`, error);
  }
};
