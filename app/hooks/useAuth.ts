// app/hooks/useAuth.ts
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  fname: string;
  lname: string;
  accessLvl: number;
  last_activity?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });
  const router = useRouter();

  useEffect(() => {
    // Fetch current user from your JWT cookie
    const fetchUser = async () => {
        console.log("🔑 useAuth: Starting to fetch user data...");
      try {
        const res = await fetch('/api/auth/me'); //another endpoint
        console.log("🔑 useAuth: Response status:", res.status);
        if (!res.ok) {
          throw new Error('Not authenticated');
        }
        
        const data = await res.json();
         console.log("✅ useAuth: User data loaded:", data.user);
        setAuthState({
          user: data.user,
          loading: false,
          error: null
        });
      } catch (error) {
        setAuthState({
          user: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Auth error'
        });
      }
    };

    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthState({ user: null, loading: false, error: null });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    logout,
    isAuthenticated: !!authState.user
  };
}