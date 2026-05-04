/**
 * Authentication API Service
 * 
 * Handles all auth-related API calls: login, register, get current user.
 */
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AUTH_BASE = `${API_BASE_URL}/api/v1/auth`;

export interface User {
  id: string;
  email: string;
  full_name: string;
  farm_name?: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/**
 * Register a new user account.
 */
export async function registerUser(
  email: string,
  password: string,
  fullName: string,
  farmName?: string,
): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(`${AUTH_BASE}/register`, {
    email,
    password,
    full_name: fullName,
    farm_name: farmName || null,
  });
  return response.data;
}

/**
 * Login with email and password.
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(`${AUTH_BASE}/login`, {
    email,
    password,
  });
  return response.data;
}

/**
 * Get the currently authenticated user's profile.
 */
export async function getCurrentUser(token: string): Promise<User> {
  const response = await axios.get<User>(`${AUTH_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}
