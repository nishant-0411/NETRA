import { apiFetch, API_BASE_URL } from './apiClient';

/**
 * Service to interact with the AI Vector Database Similarity module.
 */

/**
 * Search the Chroma vector DB for cases similar to a text query.
 * @param {string} query - Query string (e.g. modus operandi, keywords, suspect facts)
 * @param {number} [k=5] - Number of similar results to fetch
 * @param {string} [excludeCaseId=null] - Case ID to exclude from results
 * @returns {Promise<Array>} List of similar case reports
 */
export async function searchSimilarCases(query, k = 5, excludeCaseId = null) {
  try {
    const data = await apiFetch('/similarity/query', {
      method: 'POST',
      body: JSON.stringify({
        query,
        k,
        exclude_case_id: excludeCaseId,
      }),
    });
    return data?.results || [];
  } catch (err) {
    console.warn('[similarityService] searchSimilarCases error:', err.message);
    throw err;
  }
}

/**
 * Find similar past cases for a given dossier/case_id.
 * @param {string} caseId - Active case ID
 * @param {number} [k=5] - Number of matches
 * @returns {Promise<Array>} List of matching cases
 */
export async function getSimilarCasesForDossier(caseId, k = 5) {
  try {
    const data = await apiFetch(`/similarity/case/${encodeURIComponent(caseId)}?k=${k}`);
    return data?.results || [];
  } catch (err) {
    console.warn('[similarityService] getSimilarCasesForDossier error:', err.message);
    throw err;
  }
}

/**
 * Upload a document file (e.g. FIR, interrogation memo) to find similar case reports.
 * @param {File} file - Document file
 * @returns {Promise<Array>} List of similar case reports
 */
export async function uploadAndSearchSimilar(file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('netra_token');
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/similarity/similar`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload similarity search failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data?.results || [];
}
