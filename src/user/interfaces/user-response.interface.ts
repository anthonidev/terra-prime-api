/**
 * Interface para la respuesta de usuario sin campos sensibles
 */
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  document: string;
  photo: string | null;
  isActive: boolean;
  role: {
    id: number;
    code: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface para la respuesta de perfil de usuario
 */
export interface ProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  document: string;
  photo: string | null;
  role: {
    id: number;
    code: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface para vista limpia (sin campos internos de TypeORM)
 */
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

/**
 * Interface para la respuesta de vistas de usuario
 */
export interface UserViewsResponse {
  views: CleanView[];
}

/**
 * Interface para información básica de rol
 */
export interface RoleInfo {
  id: number;
  code: string;
  name: string;
}
