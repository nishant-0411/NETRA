import { apiFetch } from './apiClient';

/**
 * Resolve the authenticated investigator from the backend rather than relying
 * on a browser-cached profile.
 */
export function getCurrentUser() {
  return apiFetch('/auth/me');
}
