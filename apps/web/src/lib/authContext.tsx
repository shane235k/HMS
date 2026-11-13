// apps/web/src/lib/authContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSummary, Role } from '@hbms/shared';
import { apiFetch } from './api';

interface AuthContextType {
  user: UserSummary | null;
  loading: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }, user: UserSummary) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('hbms_access_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const userData = await apiFetch<UserSummary>('/auth/me');
      setUser(userData);
    } catch {
      localStorage.removeItem('hbms_access_token');
      localStorage.removeItem('hbms_refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (tokens: { accessToken: string; refreshToken: string }, userData: UserSummary) => {
    localStorage.setItem('hbms_access_token', tokens.accessToken);
    localStorage.setItem('hbms_refresh_token', tokens.refreshToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('hbms_refresh_token');
      if (refreshToken) {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('hbms_access_token');
      localStorage.removeItem('hbms_refresh_token');
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

