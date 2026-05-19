import React, { createContext, useContext, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('pm_tracker_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('pm_tracker_user');
    return raw ? JSON.parse(raw) : null;
  });

  const persistSession = (data) => {
    localStorage.setItem('pm_tracker_token', data.token);
    localStorage.setItem('pm_tracker_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const login = async (payload) => {
    const response = await authService.login(payload);
    persistSession(response.data);
  };

  const register = async (payload) => {
    const response = await authService.register(payload);
    persistSession(response.data);
  };

  const logout = () => {
    localStorage.removeItem('pm_tracker_token');
    localStorage.removeItem('pm_tracker_user');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), login, register, logout }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
