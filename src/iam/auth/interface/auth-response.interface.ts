export interface CleanView {
  id: number;
  code: string;
  name: string;
  icon?: string | null;
  url?: string | null;
  order: number;
  metadata?: string | string[] | null;
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
