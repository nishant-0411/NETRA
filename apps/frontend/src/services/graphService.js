import { apiFetch } from './apiClient';

/**
 * Fetches Neo4j graph nodes & relationships for a case from backend /api/cases/{caseId}/graph
 * 
 * @param {string} caseId 
 * @returns {Promise<Object>} Graph payload containing nodes and edges
 */
export async function getCaseGraph(caseId) {
  try {
    const data = await apiFetch(`/api/cases/${caseId}/graph`);
    return data;
  } catch (err) {
    console.warn(`[graphService] Failed to fetch backend graph for ${caseId}:`, err.message);
    return {
      case_id: caseId,
      nodes: [],
      edges: [],
      error: err.message,
    };
  }
}

/** Runs a case-scoped Neo4j graph analysis. */
export async function runCaseGraphAnalytics(caseId, analysis) {
  return apiFetch(
    `/api/cases/${encodeURIComponent(caseId)}/analytics/${encodeURIComponent(analysis)}`,
  );
}
