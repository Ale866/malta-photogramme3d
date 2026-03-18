import nodemailer from 'nodemailer';
import { config } from '../config/env';

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type WelcomeEmailTemplateInput = {
  nickname: string;
};

type PasswordResetEmailTemplateInput = {
  nickname: string;
  resetLink: string;
  expiresInMinutes: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function assertMailConfig() {
  const missingVars: string[] = [];

  if (!config.SMTP_USER) missingVars.push('SMTP_USER');
  if (!config.SMTP_PASS) missingVars.push('SMTP_PASS');
  if (!config.MAIL_FROM) missingVars.push('MAIL_FROM');

  if (missingVars.length > 0) {
    throw new Error(`Missing required mail env var(s): ${missingVars.join(', ')}`);
  }
}

function createTransporter() {
  assertMailConfig();

  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }

  return transporter;
}

export async function verifyMailer() {
  await getTransporter().verify();
}

export async function sendEmail(input: EmailMessage) {
  await getTransporter().sendMail({
    from: config.MAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export function buildWelcomeEmail(input: WelcomeEmailTemplateInput) {
  const nickname = escapeHtml(input.nickname);

  return {
    subject: 'Welcome to Malta Photogramme3D',
    text: [
      `Hi ${input.nickname},`,
      '',
      'Welcome to Malta Photogramme3D.',
      'Your account is ready, and you can now sign in to start exploring and creating models.',
      '',
      'We are glad to have you with us.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
        <h1 style="margin-bottom: 16px;">Welcome to Malta Photogramme3D</h1>
        <p>Hi ${nickname},</p>
        <p>Your account is ready, and you can now sign in to start exploring and creating models.</p>
        <p>We are glad to have you with us.</p>
      </div>
    `.trim(),
  };
}

export function buildPasswordResetEmail(input: PasswordResetEmailTemplateInput) {
  const nickname = escapeHtml(input.nickname);
  const resetLink = escapeHtml(input.resetLink);

  return {
    subject: 'Reset your Malta Photogramme3D password',
    text: [
      `Hi ${input.nickname},`,
      '',
      'We received a request to reset your password.',
      `Use this link to choose a new password: ${input.resetLink}`,
      '',
      `This link expires in ${input.expiresInMinutes} minutes.`,
      'If you did not request a password reset, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
        <h1 style="margin-bottom: 16px;">Reset your password</h1>
        <p>Hi ${nickname},</p>
        <p>We received a request to reset your password.</p>
        <p>
          <a
            href="${resetLink}"
            style="display: inline-block; padding: 12px 18px; background: #0a84ff; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;"
          >
            Reset password
          </a>
        </p>
        <p>This link expires in ${input.expiresInMinutes} minutes.</p>
        <p>If you did not request a password reset, you can ignore this email.</p>
      </div>
    `.trim(),
  };
}
