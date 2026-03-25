import React, { useEffect, useState } from 'react';

// This component handles the GitHub OAuth callback
// It's loaded in the popup window that was opened for GitHub auth
export function GitHubCallback() {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const errorParam = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (errorParam) {
        setStatus('error');
        setError(errorDescription || errorParam);
        
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'github-oauth-callback',
            error: errorDescription || errorParam
          }, window.location.origin);
        }
        
        setTimeout(() => window.close(), 2000);
        return;
      }

      if (code && state) {
        setStatus('success');
        
        // Send the code back to the parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'github-oauth-callback',
            code,
            state
          }, window.location.origin);
        }
        
        // Close the popup after a short delay
        setTimeout(() => window.close(), 1000);
      } else {
        setStatus('error');
        setError('No authorization code received');
        setTimeout(() => window.close(), 2000);
      }
    };

    processCallback();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center p-8">
        {status === 'processing' && (
          <>
            <div className="w-8 h-8 border-2 border-[#19AFFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#EDEDED]">Processing authentication...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-500">Connected to GitHub!</p>
            <p className="text-[#6A6A75] text-sm mt-2">This window will close automatically...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-500">Authentication failed</p>
            <p className="text-[#6A6A75] text-sm mt-2">{error}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default GitHubCallback;
