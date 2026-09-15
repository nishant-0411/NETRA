import { apiFetch } from './apiClient';

/**
 * Fetches Neo4j graph nodes & relationships for a case.
 */
export async function getCaseGraph(caseId) {
  try {
    const data = await apiFetch(`/api/cases/${caseId}/graph`);
    return data;
  } catch (err) {
    console.warn(
      `[graphService] Failed to fetch backend graph for ${caseId}:`,
      err.message
    );

    return {
      case_id: caseId,
      nodes: [],
      edges: [],
      error: err.message,
    };
  }
}

/**
 * Fetches statistics for a case from Neo4j.
 */
export async function getCaseGraphStats(caseId) {
  return apiFetch(`/api/cases/${caseId}/graph/stats`);
}

/** Runs a case-scoped Neo4j graph analysis. */
export async function runCaseGraphAnalytics(caseId, analysis) {
  return apiFetch(
    `/api/cases/${encodeURIComponent(caseId)}/analytics/${encodeURIComponent(analysis)}`,
  );
}