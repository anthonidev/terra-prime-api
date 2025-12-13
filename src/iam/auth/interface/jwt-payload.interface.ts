export interface JwtPayload {
  email: string;
  sub: string;
  role: string;
}
export interface JwtUser {
  id: string;
  email: string;
  role: {
    id: number;
    name: string;
    code: string;
  };
}

export type RequestUser = {
  id?: string;
  email?: string;
  isActive?: boolean;
  role?: {
    code?: string;
  };
};
