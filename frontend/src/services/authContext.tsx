import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

interface User {
  username: string;
  role: 'admin' | 'analyst';
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: 'admin' | 'analyst') => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('soc_user');
    return saved ? JSON.parse(saved) : { username: 'analyst', role: 'analyst', full_name: 'Lead Incident Responder' };
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('soc_access_token'));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If no token exists on first load, auto-login as analyst for seamless demonstration
    if (!token) {
      switchDemoRole('analyst').catch(() => {
        // Fallback offline mock for UI responsiveness if backend is just booting
        setUser({ username: 'analyst', role: 'analyst', full_name: 'Lead Incident Responder' });
      });
    }
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(username, password);
      const userData: User = {
        username: res.username,
        role: res.role,
        full_name: res.full_name || res.username,
      };
      setToken(res.access_token);
      setUser(userData);
      localStorage.setItem('soc_access_token', res.access_token);
      localStorage.setItem('soc_user', JSON.stringify(userData));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('soc_access_token');
    localStorage.removeItem('soc_user');
  };

  const switchDemoRole = async (targetRole: 'admin' | 'analyst') => {
    const creds = targetRole === 'admin' 
      ? { u: 'admin', p: 'soc_admin_password123' }
      : { u: 'analyst', p: 'soc_analyst_password123' };
    await login(creds.u, creds.p);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, switchDemoRole, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
