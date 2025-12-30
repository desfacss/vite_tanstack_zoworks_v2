// Email Service - Core email sending functionality

// Define the Email interface for type safety
export interface Email {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  messageId?: string;
  inReplyTo?: string | null;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  message?: string;
  data?: any;
}

interface ErrorResponse {
  message?: string;
}

/**
 * Send emails via Supabase Edge Function
 * @param emails - Array of email objects to send
 * @returns Promise with send result
 * @throws Error if sending fails
 */
export const sendEmail = async (emails: Email[]): Promise<SendEmailResult> => {
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error('Emails array is empty or invalid');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qpoxasghnbrrwmnxzyqk.supabase.co';
  const supabaseFunctionUrl = `${supabaseUrl}/functions/v1/send_email`;
  const supabaseApiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(`Failed to send emails: ${errorMessage}`);
  }

  const data = await response.json();
  return {
    success: true,
    message: data.message || 'Emails sent successfully',
    data,
  };
};
