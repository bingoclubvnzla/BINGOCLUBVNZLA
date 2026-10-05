import type { Profile, UserRole } from './database.types';

export interface AuthState {
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface RegisterDTO {
  email: string;
  password: string;
  displayName: string;
  fullName?: string;
  phone?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UpdateProfileDTO {
  displayName: string;
  fullName?: string;
  phone?: string;
}
