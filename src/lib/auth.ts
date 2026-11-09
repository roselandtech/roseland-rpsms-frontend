/**
 * The Roseland Preparatory School OS - Client Authentication Service
 * Communicates strictly with the backend NestJS Auth Microservice via API Gateway
 */

import { RoselandApi } from './api';

export interface RoselandUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'HEADMASTER' | 'TEACHER' | 'BURSAR' | 'PARENT' | 'STUDENT';
  portalAccess: string;
  avatar?: string;
  phone?: string;
  wardIndexNumbers?: string[];
  assignedClass?: string;
  studentIndexNo?: string;
  permissions?: string[];
}

export interface AuthSession {
  token: string;
  user: RoselandUser;
}

const TOKEN_KEY = 'roseland_token';
const USER_KEY = 'roseland_user';

export const AuthService = {
  /**
   * Authenticates against the backend NestJS Auth Microservice (Port 8081 via Gateway)
   */
  async login(identifier: string, password: string): Promise<AuthSession> {
    const response = await RoselandApi.auth.login({ identifier, password });
    if (response && response.accessToken && response.user) {
      this.setSession(response.accessToken, response.user);
      return {
        token: response.accessToken,
        user: response.user
      };
    }
    throw new Error(response?.message || 'Authentication failed. Please verify your credentials.');
  },

  /**
   * Sets token and user in localStorage and cookie
   */
  setSession(token: string, user: RoselandUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    // Set cookie for Next.js SSR / route compatibility (1 day expiry)
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `roseland_role=${user.role}; path=/; max-age=86400; SameSite=Lax`;
  },

  /**
   * Retrieves the currently authenticated user from localStorage
   */
  getCurrentUser(): RoselandUser | null {
    if (typeof window === 'undefined') return null;
    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as RoselandUser;
    } catch {
      return null;
    }
  },

  /**
   * Alias for getCurrentUser
   */
  getUser(): RoselandUser | null {
    return this.getCurrentUser();
  },

  /**
   * Retrieves the current access token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Check if user is actively authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  },

  /**
   * Clears session and redirects to login
   */
  logout(redirectUrl = '/login'): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `roseland_role=; path=/; max-age=0; SameSite=Lax`;
    window.location.href = redirectUrl;
  },

  /**
   * Returns destination path based on portal access
   */
  getPortalUrlForUser(user: RoselandUser): string {
    switch (user.role) {
      case 'ADMIN':
        return '/admin/permissions';
      case 'SUPER_ADMIN':
      case 'HEADMASTER':
        return '/headmaster';
      case 'BURSAR':
        return '/admin/finance';
      case 'TEACHER':
        return '/teacher';
      case 'PARENT':
        return '/parent';
      case 'STUDENT':
        return '/cbt';
      default:
        return user.portalAccess || '/portals';
    }
  },

  /**
   * Safely resolves redirect target matching the user's role domain (Best Practice)
   */
  resolveValidRedirect(user: RoselandUser, redirectQuery: string | null): string {
    const defaultPortal = this.getPortalUrlForUser(user);
    if (!redirectQuery || !redirectQuery.startsWith('/')) {
      return defaultPortal;
    }

    // ADMIN and HEADMASTER can navigate across /admin, /headmaster, and /teacher
    if (user.role === 'ADMIN' || user.role === 'HEADMASTER' || user.role === 'SUPER_ADMIN') {
      if (
        redirectQuery.startsWith('/admin') ||
        redirectQuery.startsWith('/headmaster') ||
        redirectQuery.startsWith('/teacher')
      ) {
        return redirectQuery;
      }
    }

    // Only allow deep links if they match the user's primary portal domain
    if (redirectQuery === defaultPortal || redirectQuery.startsWith(`${defaultPortal}/`)) {
      return redirectQuery;
    }

    // Otherwise fallback to user's assigned cockpit
    return defaultPortal;
  }
};
