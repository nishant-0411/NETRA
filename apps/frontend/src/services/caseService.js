import { apiFetch } from './apiClient';
import initialCasesData from '../data/casesData.json';

/**
 * Fetches list of investigative cases from backend /cases API.
 * Falls back to local casesData.json if backend is offline.
 * 
 * @returns {Promise<Array>} List of case objects
 */
export async function getCases() {
  try {
    const data = await apiFetch('/cases');
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('[caseService] Failed to fetch cases from backend, using local dataset fallback:', err.message);
  }
  return initialCasesData;
}

/**
 * Fetches detailed dossier for a specific case by caseId.
 * 
 * @param {string} caseId 
 * @returns {Promise<Object>} Case object
 */
export async function getCaseById(caseId) {
  try {
    const data = await apiFetch(`/cases/${caseId}`);
    if (data && data.case_id) {
      return data;
    }
  } catch (err) {
    console.warn(`[caseService] Failed to fetch case ${caseId} from backend:`, err.message);
  }
  const fallback = initialCasesData.find((c) => c.case_id === caseId);
  return fallback || initialCasesData[0];
}
