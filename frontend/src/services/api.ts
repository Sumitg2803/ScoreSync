export function getOrCreateDeviceToken(): string {
  let token = localStorage.getItem('scoresync_device_token');
  if (!token) {
    token = 'dev_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem('scoresync_device_token', token);
  }
  return token;
}

const API_BASE = window.location.origin.includes('localhost:5173')
  ? 'http://localhost:8000'
  : window.location.origin;

const WS_BASE = window.location.origin.includes('localhost:5173')
  ? 'ws://localhost:8000'
  : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const hostToken = localStorage.getItem('scoresync_host_token');
  if (hostToken) {
    headers['X-Host-Token'] = hostToken;
  }

  const deviceToken = localStorage.getItem('scoresync_device_token');
  if (deviceToken) {
    headers['X-Device-Token'] = deviceToken;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'API request failed' }));
    throw new Error(errorData.detail || 'API request failed');
  }
  return res.json();
}

export { API_BASE, WS_BASE };
