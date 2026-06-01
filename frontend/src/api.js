export const demoUsers = [
  { username: 'admin', label: 'Admin', description: 'Xem toàn hệ thống' },
  { username: 'alice', label: 'Alice', description: 'Owner repository' },
  { username: 'bob', label: 'Bob', description: 'Maintainer' },
  { username: 'carol', label: 'Carol', description: 'Developer' },
  { username: 'david', label: 'David', description: 'Viewer' },
];

const API_BASE = window.location.origin;

export async function api(path, methodOrOptions = 'GET', body = null) {
  const requestOptions =
    typeof methodOrOptions === 'string'
      ? {
          method: methodOrOptions,
          body,
        }
      : { ...methodOrOptions };

  const headers = {
    'Content-Type': 'application/json',
    ...(requestOptions.headers || {}),
  };

  let requestBody = requestOptions.body;
  if (requestBody && typeof requestBody !== 'string' && !(requestBody instanceof FormData)) {
    requestBody = JSON.stringify(requestBody);
  }

  const options = {
    method: requestOptions.method || 'GET',
    credentials: 'same-origin',
    ...requestOptions,
    headers,
  };

  if (requestBody != null) {
    options.body = requestBody;
  } else {
    delete options.body;
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const text = await response.text();
    let message = text || response.statusText;
    try {
      const parsed = JSON.parse(text);
      message = parsed.detail || message;
    } catch {
      // Keep the raw response text when it is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const responseType = response.headers.get('content-type') || '';
  if (!responseType.includes('application/json')) {
    return response.text();
  }

  return response.json();
}

export function login(username, password) {
  return api('/auth/login', 'POST', { username, password });
}

export function logout() {
  return api('/auth/logout', 'POST');
}

export function getRepos() {
  return api('/repos');
}

export function getRepo(name) {
  return api(`/repos/${name}`);
}

export function createRepo(data) {
  return api('/repos', 'POST', data);
}

export function deleteRepo(name) {
  return api(`/repos/${name}`, 'DELETE');
}

export function getRepoHistory(name) {
  return api(`/repos/${name}/history`);
}

export function createCommit(repoName, data) {
  return api(`/repos/${repoName}/commits`, 'POST', data);
}

export function getIssues(params = {}) {
  const query = new URLSearchParams(params).toString();
  return api(`/issues${query ? '?' + query : ''}`);
}

export function createIssue(repoName, data) {
  return api(`/repos/${repoName}/issues`, 'POST', data);
}

export function getAnalytics() {
  return api('/analytics');
}

export function searchGlobal(q) {
  return api(`/search?q=${encodeURIComponent(q)}`);
}
