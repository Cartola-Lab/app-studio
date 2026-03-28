const API_URL = process.env.REACT_APP_BACKEND_URL;

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function exchangeGitHubCode(code) {
  const res = await fetch(`${API_URL}/api/auth/github/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'GitHub login failed');
  }
  return res.json();
}

export async function exchangeGoogleCode(code, redirectUri) {
  const res = await fetch(`${API_URL}/api/auth/google/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Google login failed');
  }
  return res.json();
}

export async function getMe(token) {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: authHeaders(token),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function logout(token) {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

// Projects
export async function listProjects(token) {
  const res = await fetch(`${API_URL}/api/projects`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to load projects');
  const data = await res.json();
  return data.projects;
}

export async function createProject(token, body) {
  const res = await fetch(`${API_URL}/api/projects`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function updateProject(token, id, body) {
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

export async function deleteProject(token, id) {
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to delete project');
}

export async function exportToGDrive(token, projectId, googleAccessToken) {
  const res = await fetch(`${API_URL}/api/export/gdrive`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ project_id: projectId, access_token: googleAccessToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Google Drive export failed');
  }
  return res.json();
}
