export interface JwtPayload {
  email: string;
  sub: number;
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
