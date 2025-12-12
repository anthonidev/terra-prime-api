export interface CleanView {
  id: number;
  code: string;
  name: string;
  icon?: string | null;
  url?: string | null;
  order: number;
  metadata?: any | null;
  children: CleanView[];
}

export interface CleanRole {
  id: number;
  code: string;
  name: string;
}

export interface UserLoginInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  document: string;
  photo: string | null;
  role: CleanRole;
}

export interface LoginResponse {
  user: UserLoginInfo;
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface VerifyTokenResponse {
  success: boolean;
  message: string;
  email: string;
}
