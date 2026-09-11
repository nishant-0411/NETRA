/**
 * Centralized API client for Project NETRA.
 * Connects frontend components with FastAPI backend services.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Generic API fetch helper with JSON parsing, default headers, and graceful error handling.
 * 
 * @param {string} endpoint - Relative endpoint path (e.g. '/cases')
 * @param {RequestInit} [options={}] - Standard fetch configuration options
 * @returns {Promise<any>} Response JSON data
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Accept': 'application/json',
  };

  if (options.body && !(options.body instanceof FormData) && !options.headers?.['Content-Type']) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `API request to ${endpoint} failed with HTTP status ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorMessage = typeof errorJson.detail === 'string' 
            ? errorJson.detail 
            : JSON.stringify(errorJson.detail);
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (err) {
    console.warn(`[apiClient] Fetch failed for ${endpoint}:`, err.message);
    throw err;
  }
}
