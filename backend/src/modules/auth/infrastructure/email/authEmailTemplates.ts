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

export function buildWelcomeEmailTemplate(input: WelcomeEmailTemplateInput) {
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

export function buildPasswordResetEmailTemplate(input: PasswordResetEmailTemplateInput) {
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
