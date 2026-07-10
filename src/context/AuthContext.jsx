import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    // Check URL parameters for OAuth tokens or errors
    const params = new URLSearchParams(window.location.search);
    const urlAccessToken = params.get('accessToken');
    const urlRefreshToken = params.get('refreshToken');
    const urlError = params.get('error');

    if (urlAccessToken && urlRefreshToken) {
      localStorage.setItem('accessToken', urlAccessToken);
      localStorage.setItem('refreshToken', urlRefreshToken);
      // Clean up URL without refreshing the page
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlError) {
      console.error('OAuth Error:', urlError);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (!localStorage.getItem('accessToken')) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    // Listen for logout events triggered by api interceptor
    const handleLogout = () => setUser(null);
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = async (loginId, password) => {
    const res = await api.post('/auth/login', { login: loginId, password });
    if (res.data.success) {
      const { user: userData, accessToken, refreshToken } = res.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(userData);
      return userData;
    }
    throw new Error('Login failed');
  };

  const register = async (email, username, password, phoneNumber, countryCode) => {
    const res = await api.post('/auth/register', { email, username, password, phoneNumber, countryCode });
    if (res.data.success) {
      const { user: userData, accessToken, refreshToken } = res.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(userData);
      return userData;
    }
    throw new Error('Registration failed');
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      // Trigger a reload or redirect here if needed
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
