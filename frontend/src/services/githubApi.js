const API_URL = process.env.REACT_APP_BACKEND_URL;
const GITHUB_CLIENT_ID = process.env.REACT_APP_GITHUB_CLIENT_ID;

// Initiate GitHub OAuth flow
export function initiateGitHubAuth() {
  // Generate state for CSRF protection
  const state = Math.random().toString(36).substring(7) + Date.now().toString(36);
  sessionStorage.setItem('github_oauth_state', state);

  const redirectUri = `${window.location.origin}/auth/github/callback`;
  const scope = 'repo';

  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${GITHUB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `state=${state}`;

  // Open popup for OAuth
  const width = 600;
  const height = 700;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  const popup = window.open(
    authUrl,
    'github-auth',
    `width=${width},height=${height},left=${left},top=${top},popup=yes`
  );

  return popup;
}

// Exchange OAuth code for token
export async function exchangeCodeForToken(code) {
  const response = await fetch(`${API_URL}/api/auth/github/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to exchange code for token');
  }

  return response.json();
}

// Get authenticated user
export async function getGitHubUser(token) {
  const response = await fetch(`${API_URL}/api/github/user`, {
    headers: {
      'X-GitHub-Token': token
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user');
  }

  return response.json();
}

// List user's repositories
export async function listRepositories(token) {
  const response = await fetch(`${API_URL}/api/github/repos`, {
    headers: {
      'X-GitHub-Token': token
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch repositories');
  }

  return response.json();
}

// Create a new repository
export async function createRepository(token, name, description, isPrivate) {
  const response = await fetch(`${API_URL}/api/github/repos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Token': token
    },
    body: JSON.stringify({
      name,
      description,
      private: isPrivate
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create repository');
  }

  return response.json();
}

// List branches of a repository
export async function listBranches(token, owner, repo) {
  const response = await fetch(`${API_URL}/api/github/repos/${owner}/${repo}/branches`, {
    headers: {
      'X-GitHub-Token': token
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch branches');
  }

  return response.json();
}

// Push files to repository
export async function pushFiles(token, options) {
  const response = await fetch(`${API_URL}/api/github/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Token': token
    },
    body: JSON.stringify({
      repo: options.repo,
      branch: options.branch,
      path: options.path,
      commit_message: options.commitMessage,
      files: options.files
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to push to GitHub');
  }

  return response.json();
}

// Disconnect GitHub (clear local storage)
export function disconnectGitHub() {
  sessionStorage.removeItem('github_token');
  sessionStorage.removeItem('github_user');
  sessionStorage.removeItem('github_oauth_state');
}

// Get stored token
export function getStoredToken() {
  return sessionStorage.getItem('github_token');
}

// Get stored user
export function getStoredUser() {
  const userStr = sessionStorage.getItem('github_user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
}

// Store token and user
export function storeGitHubAuth(token, user) {
  sessionStorage.setItem('github_token', token);
  sessionStorage.setItem('github_user', JSON.stringify(user));
}

// Generate files for push
export function generateFilesForPush(preview) {
  const files = [];

  // index.html
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  ${preview.html || '<!-- No HTML content -->'}
  <script src="script.js"></script>
</body>
</html>`;

  files.push({ name: 'index.html', content: htmlContent });

  // styles.css
  files.push({ 
    name: 'styles.css', 
    content: preview.css || '/* No CSS content */' 
  });

  // script.js
  files.push({ 
    name: 'script.js', 
    content: preview.js || '// No JavaScript content' 
  });

  // README.md
  const readmeContent = `# App

Generated by [Cartola Lab Studio](https://studio.cartolab.co) with BroStorm AI.

## Getting Started

Open \`index.html\` in your browser to view the app.

## Files

- \`index.html\` - Main HTML file
- \`styles.css\` - Stylesheet
- \`script.js\` - JavaScript logic

---

*Generated on ${new Date().toISOString()}*
`;

  files.push({ name: 'README.md', content: readmeContent });

  return files;
}
