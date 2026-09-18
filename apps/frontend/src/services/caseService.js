import { apiFetch } from './apiClient';

/**
 * Fetches the signed-in investigator's authorised cases from the backend.
 * 
 * @returns {Promise<Array>} List of case objects
 */
export async function getCases() {
  try {
    const data = await apiFetch('/cases');
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return [];
  } catch (err) {
    console.warn('[caseService] Failed to fetch cases from backend:', err.message);
    throw err;
  }
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
    throw new Error(`Case ${caseId} was not returned by the API.`);
  } catch (err) {
    console.warn(`[caseService] Failed to fetch case ${caseId} from backend:`, err.message);
    throw err;
  }
}

/** Open a new dossier. The signed-in officer becomes its initial lead. */
export async function createCase(payload) {
  return apiFetch('/cases', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
