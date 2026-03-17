import https from 'https';
import type { AuthEmailService } from '../../application/ports';
import { config } from '../../../../shared/config/env';
import { buildPasswordResetEmailTemplate, buildWelcomeEmailTemplate } from './authEmailTemplates';

function getResendApiKey() {
  if (!config.RESEND_API_KEY) {
    throw new Error('Missing required env var: RESEND_API_KEY');
  }

  return config.RESEND_API_KEY;
}

function getFromAddress() {
  if (!config.RESEND_FROM_EMAIL) {
    throw new Error('Missing required env var: RESEND_FROM_EMAIL');
  }

  if (!config.RESEND_FROM_NAME) {
    throw new Error('Missing required env var: RESEND_FROM_NAME');
  }

  return `${config.RESEND_FROM_NAME} <${config.RESEND_FROM_EMAIL}>`;
}

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

async function sendEmail(input: SendEmailInput) {
  const payload = JSON.stringify({
    from: getFromAddress(),
    to: [input.to],
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  await new Promise<void>((resolve, reject) => {
    const request = https.request(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getResendApiKey()}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          const statusCode = response.statusCode ?? 500;

          if (statusCode >= 200 && statusCode < 300) {
            resolve();
            return;
          }

          reject(new Error(`Resend email request failed (${statusCode}): ${body || 'empty response'}`));
        });
      }
    );

    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

export const resendAuthEmailService: AuthEmailService = {
  async sendWelcomeEmail(input) {
    const template = buildWelcomeEmailTemplate({
      nickname: input.nickname,
    });

    await sendEmail({
      to: input.to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  },

  async sendPasswordResetEmail(input) {
    const template = buildPasswordResetEmailTemplate({
      nickname: input.nickname,
      resetLink: input.resetLink,
      expiresInMinutes: input.expiresInMinutes,
    });

    await sendEmail({
      to: input.to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  },
};
