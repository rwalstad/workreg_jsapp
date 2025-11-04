// lib/email.ts
import { Resend } from 'resend';

interface InvitationEmailProps {
  email: string;
  accountName: string;
  inviteUrl: string;
}

interface EmailResponse {
  success: boolean;
  error?: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendInvitationEmail = async ({
  email,
  accountName,
  inviteUrl
}: InvitationEmailProps): Promise<EmailResponse> => {
  try {
    await resend.emails.send({
      from: 'Lead Maestro <lm-invite@beautifulstate.life>',
      to: email,
      subject: `You've been invited to join ${accountName} on Lead Maestro`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited!</h2>
          <p>You've been invited to join ${accountName} on Lead Maestro.</p>
          <p>Click the link below to accept the invitation and create your account:</p>
          <a href="${inviteUrl}"
             style="display: inline-block; background-color: #0066CC; color: white;
                    padding: 12px 24px; text-decoration: none; border-radius: 6px;
                    margin: 20px 0;">
            Accept Invitation
          </a>
          <p style="color: #666; font-size: 14px;">
            This invitation will expire in 7 days.
          </p>
        </div>
      `
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send invitation email:', error);
    return { success: false, error: error.message as string };
  }
};