import type { AuthEmailService } from '../../application/ports';
import {
  buildPasswordResetEmail,
  buildWelcomeEmail,
  sendEmail,
} from '../../../../shared/services/mailService';

export const nodemailerAuthEmailService: AuthEmailService = {
  async sendWelcomeEmail(input) {
    const email = buildWelcomeEmail({
      nickname: input.nickname,
    });

    await sendEmail({
      to: input.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  },

  async sendPasswordResetEmail(input) {
    const email = buildPasswordResetEmail({
      nickname: input.nickname,
      resetLink: input.resetLink,
      expiresInMinutes: input.expiresInMinutes,
    });

    await sendEmail({
      to: input.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  },
};
