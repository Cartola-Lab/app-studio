import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../services/authApi';

const AuthContext = createContext(null);

const TOKEN_KEY = 'cartolab_studio_token';
const GITHUB_TOKEN_KEY = 'cartolab_github_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem(GITHUB_TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    async function verify() {
      if (!token) {
        setLoading(false);
        return;
      }
      const me = await getMe(token);
      if (me) {
        setUser(me);
      } else {
        // Token expired or invalid
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
      setLoading(false);
    }
    verify();
  }, [token]);

  const loginWithGitHub = useCallback((sessionToken, accessToken, userData) => {
    localStorage.setItem(TOKEN_KEY, sessionToken);
    if (accessToken) {
      localStorage.setItem(GITHUB_TOKEN_KEY, accessToken);
      setGithubToken(accessToken);
    }
    setToken(sessionToken);
    setUser(userData);
  }, []);

  const loginWithGoogle = useCallback((sessionToken, userData) => {
    localStorage.setItem(TOKEN_KEY, sessionToken);
    setToken(sessionToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    setToken(null);
    setGithubToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    githubToken,
    loading,
    isAuthenticated: !!user,
    loginWithGitHub,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
