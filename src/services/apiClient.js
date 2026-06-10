import { mockApiRequest } from './mockApi';

const DEFAULT_BASE_URL = 'http://localhost:8000';
const USE_MOCK_API = process.env.REACT_APP_USE_MOCK_API === 'true';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');

export async function apiFetch(path, options = {}) {
  if (USE_MOCK_API) {
    return mockApiRequest(path, options);
  }

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = data?.detail || data?.message || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
