import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { exchangeGitHubCode } from '../services/authApi';

const LOGO_URL =
  'https://static.prod-images.emergentagent.com/jobs/a95524e6-8d57-4a33-859d-6152ef3b48ac/images/2070b10d51be382b528c9736b63433b9f2d0fde90572e8b86fdc5a1b96d57c17.png';

const GITHUB_CLIENT_ID = process.env.REACT_APP_GITHUB_CLIENT_ID;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const APP_URL = process.env.REACT_APP_URL || window.location.origin;

export default function LoginPage() {
  const { isAuthenticated, loginWithGitHub } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Handle GitHub OAuth callback (code in query param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const provider = params.get('provider') || 'github';
    if (!code) return;

    // Clear URL params immediately
    window.history.replaceState({}, '', '/login');

    if (provider === 'github') {
      exchangeGitHubCode(code)
        .then(({ session_token, access_token, user }) => {
          loginWithGitHub(session_token, access_token, user);
          navigate('/dashboard', { replace: true });
        })
        .catch((err) => {
          console.error('GitHub login error:', err);
        });
    }
  }, [loginWithGitHub, navigate]);

  function handleGitHubLogin() {
    if (!GITHUB_CLIENT_ID) {
      alert('GitHub OAuth not configured (REACT_APP_GITHUB_CLIENT_ID missing)');
      return;
    }
    const redirectUri = encodeURIComponent(`${APP_URL}/login?provider=github`);
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=read:user,user:email,repo`;
  }

  function handleGoogleLogin() {
    if (!GOOGLE_CLIENT_ID) {
      alert('Google OAuth not configured (REACT_APP_GOOGLE_CLIENT_ID missing)');
      return;
    }
    const redirectUri = encodeURIComponent(`${APP_URL}/auth/google/callback`);
    const scope = encodeURIComponent('openid email profile');
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <img src={LOGO_URL} alt="Cartola Lab" className="h-10 mb-4" />
          <h1 className="text-[#EDEDED] text-2xl font-bold tracking-tight">Studio</h1>
          <p className="text-[#888] text-sm mt-1">
            Crie MVPs visuais em minutos.
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-[#111115] border border-[#22222A] rounded-xl p-6 flex flex-col gap-3">
          <button
            onClick={handleGitHubLogin}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-lg bg-[#1a1a22] border border-[#22222A] text-[#EDEDED] text-sm font-medium hover:bg-[#22222A] hover:border-[#333] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Entrar com GitHub
          </button>

          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-lg bg-[#1a1a22] border border-[#22222A] text-[#EDEDED] text-sm font-medium hover:bg-[#22222A] hover:border-[#333] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>
        </div>

        <p className="text-center text-[#555] text-xs mt-6">
          Ao entrar, você concorda com os{' '}
          <span className="text-[#888]">termos de uso</span> da Cartola Lab.
        </p>
      </div>
    </div>
  );
}
