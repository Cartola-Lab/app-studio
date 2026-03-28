import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { exchangeGoogleCode } from '../services/authApi';

const APP_URL = process.env.REACT_APP_URL || window.location.origin;

export default function GoogleCallback() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error || !code) {
      navigate('/login', { replace: true });
      return;
    }

    const redirectUri = `${APP_URL}/auth/google/callback`;
    exchangeGoogleCode(code, redirectUri)
      .then(({ session_token, user }) => {
        loginWithGoogle(session_token, user);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, [loginWithGoogle, navigate]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-[#888] text-sm">Autenticando com Google...</div>
    </div>
  );
}
