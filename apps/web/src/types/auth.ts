export type UserRole =
  | 'super_admin'
  | 'administrator'
  | 'manager'
  | 'employee'
  | 'read_only';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}
