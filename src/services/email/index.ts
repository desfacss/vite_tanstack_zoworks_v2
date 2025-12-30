// Email Service - Re-exports
export { sendEmail, type Email, type SendEmailResult } from './emailService';
export { 
  generateEmailData, 
  type EmailDetails, 
  type GeneratedEmail, 
  type EmailType, 
  type EmailAction 
} from './emailTemplates';
