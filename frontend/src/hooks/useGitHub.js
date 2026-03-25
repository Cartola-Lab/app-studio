import { useState, useEffect, useCallback } from 'react';
import {
  getStoredToken,
  getStoredUser,
  storeGitHubAuth,
  disconnectGitHub,
  exchangeCodeForToken,
  initiateGitHubAuth
} from '../services/githubApi';

export function useGitHub() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize from session storage
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      setIsConnected(true);
    }
    setIsLoading(false);
  }, []);

  // Handle OAuth callback messages from popup
  useEffect(() => {
    const handleMessage = async (event) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'github-oauth-callback') {
        const { code, state, error } = event.data;
        
        if (error) {
          setError(error);
          return;
        }

        // Verify state for CSRF protection
        const storedState = sessionStorage.getItem('github_oauth_state');
        if (state !== storedState) {
          setError('State mismatch. Possible CSRF attack.');
          return;
        }

        try {
          setIsLoading(true);
          const data = await exchangeCodeForToken(code);
          
          storeGitHubAuth(data.access_token, data.user);
          setToken(data.access_token);
          setUser(data.user);
          setIsConnected(true);
          setError(null);
        } catch (err) {
          setError(err.message);
        } finally {
          setIsLoading(false);
          sessionStorage.removeItem('github_oauth_state');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const connect = useCallback(() => {
    const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
    if (!clientId) {
      setError('GitHub OAuth is not configured. Please set REACT_APP_GITHUB_CLIENT_ID.');
      return;
    }
    
    initiateGitHubAuth();
  }, []);

  const disconnect = useCallback(() => {
    disconnectGitHub();
    setToken(null);
    setUser(null);
    setIsConnected(false);
  }, []);

  return {
    token,
    user,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    clearError: () => setError(null)
  };
}

export default useGitHub;
