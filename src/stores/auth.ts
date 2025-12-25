import { create } from 'zustand';
import { pb, getCurrentUser, isAdmin } from '@/lib/pocketbase';
import type { User } from '@/types';
import { checkRateLimit, resetRateLimit, getRemainingAttempts, getResetTime } from '@/lib/rate-limit';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, passwordConfirm: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Initialize auth state
  const checkAuth = () => {
    const user = getCurrentUser() as User | null;
    set({
      user,
      isAuthenticated: !!user,
      isAdmin: isAdmin(),
      isLoading: false,
    });
  };

  // Check auth on store creation
  checkAuth();

  // Listen to auth changes
  pb.authStore.onChange(() => {
    checkAuth();
  });

  return {
    user: getCurrentUser() as User | null,
    isAuthenticated: !!getCurrentUser(),
    isAdmin: isAdmin(),
    isLoading: false,
    
    login: async (email: string, password: string) => {
      // Rate limiting: 5 attempts per 15 minutes per email
      const rateLimitKey = `login:${email.toLowerCase()}`;
      const maxAttempts = 5;
      const windowMs = 15 * 60 * 1000; // 15 minutes
      
      if (!checkRateLimit(rateLimitKey, maxAttempts, windowMs)) {
        const remainingTime = getResetTime(rateLimitKey);
        const minutes = remainingTime ? Math.ceil(remainingTime / 60000) : 15;
        throw new Error(`Too many login attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`);
      }
      
      try {
        await pb.collection('users').authWithPassword(email, password);
        // Reset rate limit on successful login
        resetRateLimit(rateLimitKey);
        checkAuth();
      } catch (error: any) {
        // Don't reset rate limit on failure
        throw error;
      }
    },
    
    register: async (email: string, password: string, passwordConfirm: string, name?: string) => {
      // Rate limiting: 3 registrations per hour per IP (using email as proxy)
      const rateLimitKey = `register:${email.toLowerCase()}`;
      const maxAttempts = 3;
      const windowMs = 60 * 60 * 1000; // 1 hour
      
      if (!checkRateLimit(rateLimitKey, maxAttempts, windowMs)) {
        const remainingTime = getResetTime(rateLimitKey);
        const minutes = remainingTime ? Math.ceil(remainingTime / 60000) : 60;
        throw new Error(`Too many registration attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`);
      }
      
      try {
        // Create user
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm,
          name,
        });
        
        // Reset rate limit on successful registration
        resetRateLimit(rateLimitKey);
        
        // Auto-login after registration
        await pb.collection('users').authWithPassword(email, password);
        checkAuth();
      } catch (error: any) {
        // Don't reset rate limit on failure
        throw error;
      }
    },
    
    loginWithGoogle: async () => {
      try {
        const authMethods = await pb.collection('users').listAuthMethods();
        const googleProvider = authMethods.authProviders?.find(
          (provider) => provider.name === 'google'
        );
        
        if (!googleProvider) {
          throw new Error('Google OAuth not configured');
        }
        
        // Redirect to OAuth
        const redirectUrl = `${window.location.origin}/auth/callback`;
        const url = googleProvider.authUrl + redirectUrl;
        window.location.href = url;
      } catch (error) {
        throw error;
      }
    },
    
    logout: () => {
      pb.authStore.clear();
      checkAuth();
    },
    
    checkAuth,
  };
});

