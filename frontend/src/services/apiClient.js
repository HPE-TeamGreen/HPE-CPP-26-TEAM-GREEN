import { mockApiRequest } from './mockApi';

const DEFAULT_BASE_URL = 'http://localhost:8000';
const DEFAULT_TELEMETRY_URL = 'http://localhost:8001';
const DEFAULT_REPORTING_URL = 'http://localhost:8002';
const USE_MOCK_API = process.env.REACT_APP_USE_MOCK_API === 'true';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
const TELEMETRY_BASE_URL = (process.env.REACT_APP_TELEMETRY_API_URL || DEFAULT_TELEMETRY_URL).replace(/\/$/, '');
const REPORTING_BASE_URL = (process.env.REACT_APP_REPORTING_API_URL || DEFAULT_REPORTING_URL).replace(/\/$/, '');

async function doFetch(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
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
    let message;
    if (Array.isArray(data?.detail)) {
      // FastAPI validation errors come as [{loc: [...], msg: "...", type: "..."}, ...]
      message = data.detail.map(e => typeof e === 'object' ? (e.msg || JSON.stringify(e)) : e).join('; ');
    } else {
      message = data?.detail || data?.message || `Request failed (${response.status})`;
    }
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function apiFetch(path, options = {}) {
  if (USE_MOCK_API) {
    return mockApiRequest(path, options);
  }
  return doFetch(API_BASE_URL, path, options);
}

export async function telemetryFetch(path, options = {}) {
  if (USE_MOCK_API) {
    return mockApiRequest(path, options);
  }
  return doFetch(TELEMETRY_BASE_URL, path, options);
}

export async function reportingFetch(path, options = {}) {
  if (USE_MOCK_API) {
    return mockApiRequest(path, options);
  }
  return doFetch(REPORTING_BASE_URL, path, options);
}
