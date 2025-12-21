// import { notification } from 'antd';

// // Define the Email interface for type safety
// interface Email {
//   from: string;
//   to: string | string[];
//   subject: string;
//   html: string;
//   cc?: string | string[]; // Optional fields
//   bcc?: string | string[];
//   replyTo?: string;
// }

// // Define the ErrorResponse interface for Supabase Edge Function errors
// interface ErrorResponse {
//   message?: string;
// }

// // Environment variables interface (optional, for better type checking)
// interface EnvConfig {
//   VITE_SUPABASE_BASE_URL?: string;
//   VITE_SUPABASE_ANON_KEY?: string;
// }

// // Send email function with TypeScript
// export const sendEmail = async (emails: Email[]): Promise<any> => {
//   try {
//     // Validate input
//     if (!Array.isArray(emails) || emails.length === 0) {
//       console.error('Emails array is empty or invalid');
//       notification.error({
//         message: 'Error',
//         description: 'Emails array is empty or invalid.',
//       });
//       return;
//     }

//     // Safely access environment variables
//     const env: EnvConfig = import.meta.env;
//     const supabaseUrl =
//       env.VITE_SUPABASE_BASE_URL || 'https://qpoxasghnbrrwmnxzyqk.supabase.co';
//     const supabaseFunctionUrl = `${supabaseUrl}/functions/v1/send_email`;
//     const supabaseApiKey = env.VITE_SUPABASE_ANON_KEY;

//     // Make the fetch request to Supabase Edge Function
//     const response = await fetch(supabaseFunctionUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         ...(supabaseApiKey && { Authorization: `Bearer ${supabaseApiKey}` }),
//       },
//       body: JSON.stringify(emails),
//     });

//     // Handle non-OK responses
//     if (!response.ok) {
//       let errorMessage = 'Failed to send emails';
//       try {
//         const errorData: ErrorResponse = await response.json();
//         errorMessage = errorData?.message || errorMessage;
//       } catch (jsonError) {
//         errorMessage = response.statusText || errorMessage;
//       }
//       console.error('Failed to send emails:', errorMessage);
//       notification.error({
//         message: 'Error',
//         description: errorMessage,
//       });
//       throw new Error(`Failed to send emails: ${errorMessage}`);
//     }

//     // Parse successful response
//     const data = await response.json();
//     console.log('Emails sent successfully:', data);
//     notification.success({
//       message: 'Success',
//       description: data.message || 'Emails sent successfully.',
//     });
//     return data;
//   } catch (error: any) {
//     console.error('Error sending emails:', error);
//     notification.error({
//       message: 'Error',
//       description: error.message || 'An unexpected error occurred while sending emails.',
//     });
//     throw error;
//   }
// };


import { notification } from 'antd';
import { useAuthStore } from "@/core/lib/store";

// Define the Email interface for type safety
interface Email {
  from: string;
  to: string | string[];
  subject: string;
  text?: string; // Matches Edge Function expectation
  html?: string;
  messageId?: string;
  inReplyTo?: string | null;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

// Define the ErrorResponse interface for Supabase Edge Function errors
interface ErrorResponse {
  message?: string;
}

// Environment variables interface
interface EnvConfig {
  VITE_SUPABASE_BASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export const sendEmail = async (emails: Email[]): Promise<any> => {
  try {
    if (!Array.isArray(emails) || emails.length === 0) {
      console.error('Emails array is empty or invalid');
      notification.error({
        message: 'Error',
        description: 'Emails array is empty or invalid.',
      });
      return;
    }

    const env: EnvConfig = import.meta.env;
    const supabaseUrl = env.VITE_SUPABASE_URL || 'https://qpoxasghnbrrwmnxzyqk.supabase.co';
    const supabaseFunctionUrl = `${supabaseUrl}/functions/v1/send_email`;
    const supabaseApiKey = env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(supabaseFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(supabaseApiKey && { Authorization: `Bearer ${supabaseApiKey}` }),
      },
      body: JSON.stringify(emails),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to send emails';
      try {
        const errorData: ErrorResponse = await response.json();
        errorMessage = errorData?.message || errorMessage;
      } catch (jsonError) {
        errorMessage = response.statusText || errorMessage;
      }
      console.error('Failed to send emails:', errorMessage);
      notification.error({
        message: 'Error',
        description: errorMessage,
      });
      throw new Error(`Failed to send emails: ${errorMessage}`);
    }

    const data = await response.json();
    console.log('Emails sent successfully:', data);
    notification.success({
      message: 'Success',
      description: data.message || 'Emails sent successfully.',
    });
    return data;
  } catch (error: any) {
    console.error('Error sending emails:', error);
    notification.error({
      message: 'Error',
      description: error.message || 'An unexpected error occurred while sending emails.',
    });
    throw error;
  }
};

export const generateEmailData = (type, action, details) => {
    const { appSettings } = useAuthStore.getState();
    const {
        username, approverUsername,
        approverEmail, hrEmails, userEmail,
        applicationDate,
        // submittedTime, reviewedTime,
        comment,
    } = details;

    // const state = store.getState();
    // const { submissionEmail = true, reviewEmail = true } = state?.auth?.session?.user?.organization?.timesheet_settings?.approvalWorkflow || {};
    const submissionEmail = true
    const reviewEmail = true 
    let subject, body, recipients;

    // Determine subject and body content
    switch (type) {
        case "timesheet":
            if (action === "Submitted") {
                if (!submissionEmail) return;
                subject = `Timesheet Submitted by ${username}`;
                body = `Timesheet ${applicationDate} is submitted by ${username}.`;
                // recipients = [approverEmail, ...hrEmails];
                //For Local Testing
                recipients = [approverEmail];
            } else if (["Approved", "Rejected"].includes(action)) {
                if (!reviewEmail) return;
                subject = `Timesheet ${action} by ${approverUsername}`;
                body = `Your Timesheet ${applicationDate} is ${action.toLowerCase()} by ${approverUsername} ${comment ? ` with the following comment: ${comment}` : ""}`;
                recipients = [userEmail];
            }
            break;
        case "leave application":
            if (action === "Submitted") {
                if (!submissionEmail) return;
                subject = `Leave Application Submitted by ${username}`;
                body = `${username} is submitting ${type} ${applicationDate} for approval.`;
                // recipients = [approverEmail, ...hrEmails];
                recipients = [approverEmail];
            } else if (["Approved", "Rejected"].includes(action)) {
                if (!reviewEmail) return;
                subject = `Leave Application ${action} by ${approverUsername}`;
                body = `Your leave application ${applicationDate} is ${action.toLowerCase()} ${comment ? ` with the following comment: ${comment}` : ""}`;
                recipients = [userEmail];
            }
            break;
        case "expenses claim":
            if (action === "Submitted") {
                if (!submissionEmail) return;
                subject = `Expenses Claim Submitted by ${username}`;
                body = `${username} is submitting ${type} ${applicationDate} for approval.`;
                // recipients = [approverEmail, ...hrEmails];
                recipients = [approverEmail];
            } else if (["Approved", "Rejected"].includes(action)) {
                if (!reviewEmail) return;
                subject = `Expenses Claim ${action} by ${approverUsername}`;
                // body = `${type} ${applicationDate} ${action.toLowerCase()} by ${approverUsername} on ${reviewedTime}${comment ? ` with the following comment: ${comment}` : ""}`;
                body = `Your ${type} ${applicationDate} is ${action.toLowerCase()} ${comment ? `<br/>With the following comment: ${comment}` : ""}`;
                recipients = [userEmail];
            }
            break;

        default:
            throw new Error("Invalid type or action");
    }

    // Return the email data object
    return {
        // from: process.env.REACT_APP_RESEND_FROM_EMAIL,
        from: `UKPE Timesheet <${appSettings?.emailOverrides?.email ||appSettings?.email?.[0]||import.meta.env.VITE_RESEND_FROM_EMAIL}>`,
        to: recipients,
        subject: subject,
        html: `<p>${body}</p><p>If you are not the intended recipient, you can safely ignore this message or contact your HR for assistance.
</p><p>Best Regards,<br/>UKPE Global Admin Team</p>`,
    };
};

