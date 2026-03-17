import { getErrorCode, getErrorMessage, http } from '@/core/api/httpClient';

export class AuthApiError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
  }
}

export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: AuthUser;
};

export type UserInput = {
  email: string;
  password: string;
  nickname?: string;
}

export type MessageResponse = {
  message: string;
}

export type ResetPasswordInput = {
  token: string;
  password: string;
  confirmPassword: string;
}

export type ResetPasswordTokenValidationResponse = {
  expiresAt: string;
}

function toAuthApiError(err: unknown) {
  return new AuthApiError(getErrorMessage(err), getErrorCode(err));
}

export const AuthApi = {
  async login(input: UserInput): Promise<AuthResponse> {
    try {
      const res = await http.post<AuthResponse>('/auth/login', input);
      return res.data;
    } catch (err) {
      throw toAuthApiError(err);
    }
  },

  async register(input: UserInput): Promise<AuthResponse> {
    try {
      const res = await http.post<AuthResponse>('/auth/register', input);
      return res.data;
    } catch (err) {
      throw toAuthApiError(err);
    }
  },

  async refresh(): Promise<AuthResponse> {
    try {
      const res = await http.post<AuthResponse>('/auth/refresh');
      return res.data;
    } catch (err) {
      throw toAuthApiError(err);
    }
  },

  async logout(): Promise<void> {
    try {
      await http.post('/auth/logout');
    } catch (err) {
      throw toAuthApiError(err);
    }
  },

  async forgotPassword(email: string): Promise<MessageResponse> {
    try {
      const res = await http.post<MessageResponse>('/auth/forgot-password', { email });
      return res.data;
    } catch (err) {
      throw toAuthApiError(err);
    }
  },

  async validateResetPasswordToken(token: string): Promise<ResetPasswordTokenValidationResponse> {
    try {
      const res = await http.get<ResetPasswordTokenValidationResponse>('/auth/reset-password/validate', {
        params: { token },
      });
      return res.data;
    } catch (err) {
      throw toAuthApiError(err);
    }
  },

  async resetPassword(input: ResetPasswordInput): Promise<MessageResponse> {
    try {
      const res = await http.post<MessageResponse>('/auth/reset-password', input);
      return res.data;
    } catch (err) {
      throw toAuthApiError(err);
    }
  },
};
