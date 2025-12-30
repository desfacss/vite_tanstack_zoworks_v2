// Email Templates - Email content generation for various notification types
import { useAuthStore } from '@/core/lib/store';

export interface EmailDetails {
  username?: string;
  approverUsername?: string;
  approverEmail?: string;
  hrEmails?: string[];
  userEmail?: string;
  applicationDate?: string;
  comment?: string;
}

export interface GeneratedEmail {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

export type EmailType = 'timesheet' | 'leave application' | 'expenses claim';
export type EmailAction = 'Submitted' | 'Approved' | 'Rejected';

/**
 * Generate email data for various notification types
 * @param type - Type of notification (timesheet, leave application, expenses claim)
 * @param action - Action taken (Submitted, Approved, Rejected)
 * @param details - Details for email generation
 * @returns Generated email object or undefined if email should not be sent
 */
export const generateEmailData = (
  type: EmailType,
  action: EmailAction,
  details: EmailDetails
): GeneratedEmail | undefined => {
  const { appSettings } = useAuthStore.getState();
  const {
    username,
    approverUsername,
    approverEmail,
    userEmail,
    applicationDate,
    comment,
  } = details;

  // Email settings - could be made configurable
  const submissionEmail = true;
  const reviewEmail = true;

  let subject: string | undefined;
  let body: string | undefined;
  let recipients: string[] | undefined;

  switch (type) {
    case 'timesheet':
      if (action === 'Submitted') {
        if (!submissionEmail) return undefined;
        subject = `Timesheet Submitted by ${username}`;
        body = `Timesheet ${applicationDate} is submitted by ${username}.`;
        recipients = approverEmail ? [approverEmail] : [];
      } else if (['Approved', 'Rejected'].includes(action)) {
        if (!reviewEmail) return undefined;
        subject = `Timesheet ${action} by ${approverUsername}`;
        body = `Your Timesheet ${applicationDate} is ${action.toLowerCase()} by ${approverUsername}${comment ? ` with the following comment: ${comment}` : ''}`;
        recipients = userEmail ? [userEmail] : [];
      }
      break;

    case 'leave application':
      if (action === 'Submitted') {
        if (!submissionEmail) return undefined;
        subject = `Leave Application Submitted by ${username}`;
        body = `${username} is submitting ${type} ${applicationDate} for approval.`;
        recipients = approverEmail ? [approverEmail] : [];
      } else if (['Approved', 'Rejected'].includes(action)) {
        if (!reviewEmail) return undefined;
        subject = `Leave Application ${action} by ${approverUsername}`;
        body = `Your leave application ${applicationDate} is ${action.toLowerCase()}${comment ? ` with the following comment: ${comment}` : ''}`;
        recipients = userEmail ? [userEmail] : [];
      }
      break;

    case 'expenses claim':
      if (action === 'Submitted') {
        if (!submissionEmail) return undefined;
        subject = `Expenses Claim Submitted by ${username}`;
        body = `${username} is submitting ${type} ${applicationDate} for approval.`;
        recipients = approverEmail ? [approverEmail] : [];
      } else if (['Approved', 'Rejected'].includes(action)) {
        if (!reviewEmail) return undefined;
        subject = `Expenses Claim ${action} by ${approverUsername}`;
        body = `Your ${type} ${applicationDate} is ${action.toLowerCase()}${comment ? `<br/>With the following comment: ${comment}` : ''}`;
        recipients = userEmail ? [userEmail] : [];
      }
      break;

    default:
      throw new Error('Invalid type or action');
  }

  if (!subject || !body || !recipients) {
    return undefined;
  }

  const fromEmail = appSettings?.emailOverrides?.email || appSettings?.email?.[0] || import.meta.env.VITE_RESEND_FROM_EMAIL;

  return {
    from: `UKPE Timesheet <${fromEmail}>`,
    to: recipients,
    subject,
    html: `<p>${body}</p><p>If you are not the intended recipient, you can safely ignore this message or contact your HR for assistance.</p><p>Best Regards,<br/>UKPE Global Admin Team</p>`,
  };
};
