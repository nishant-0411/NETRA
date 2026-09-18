import { apiFetch } from './apiClient';

/**
 * Fetch all cases registered in the system (for discovering running cases requiring access).
 * @returns {Promise<Array>} List of all system case objects
 */
export async function getAllSystemCases() {
  try {
    const data = await apiFetch('/cases?all_cases=true');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[caseAccessService] Failed to fetch all system cases:', err.message);
    throw err;
  }
}

/**
 * Fetch access summary for a specific case.
 * @param {string} caseId
 * @returns {Promise<Object>} Access summary { case_id, lead_investigator, has_access, is_lead, is_pending, authorised_personnel_count }
 */
export async function getCaseAccessSummary(caseId) {
  try {
    return await apiFetch(`/case-access/${caseId}`);
  } catch (err) {
    console.warn(`[caseAccessService] Failed to fetch access summary for ${caseId}:`, err.message);
    throw err;
  }
}

/**
 * Submit an access request for a case to its designated lead investigator.
 * @param {string} caseId
 * @param {string} [message]
 * @returns {Promise<Object>} Created AccessRequest object
 */
export async function requestCaseAccess(caseId, message = '') {
  return apiFetch(`/case-access/${caseId}/requests`, {
    method: 'POST',
    body: JSON.stringify({ message: message?.trim() || null }),
  });
}

/**
 * Fetch all pending access requests for a case led by the current user.
 * @param {string} caseId
 * @returns {Promise<{case_id: string, requests: Array}>}
 */
export async function getPendingAccessRequests(caseId) {
  return apiFetch(`/case-access/${caseId}/requests`);
}

/**
 * Approve or reject a pending case access request (Lead Investigator only).
 * @param {string} caseId
 * @param {string} requestId
 * @param {boolean} approve
 * @returns {Promise<Object>}
 */
export async function decideAccessRequest(caseId, requestId, approve) {
  return apiFetch(`/case-access/${caseId}/requests/${requestId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ approve: Boolean(approve) }),
  });
}

/**
 * List pending access requests initiated by the signed-in user across all cases.
 * @returns {Promise<{requests: Array}>}
 */
export async function getMyAccessRequests() {
  try {
    const data = await apiFetch('/case-access/user/requests');
    return data?.requests || [];
  } catch (err) {
    console.warn('[caseAccessService] Failed to fetch user requests:', err.message);
    return [];
  }
}

/**
 * Revoke a collaborator's access from a case (Lead only).
 * @param {string} caseId
 * @param {string} policeId
 * @returns {Promise<Object>}
 */
export async function revokeCaseAccess(caseId, policeId) {
  return apiFetch(`/case-access/${caseId}/personnel/${policeId}`, {
    method: 'DELETE',
  });
}

/**
 * Get lead investigator workload and statistics.
 * @returns {Promise<Object>}
 */
export async function getLeadWorkload() {
  return apiFetch('/case-access/lead/workload');
}

/**
 * Claim an unconfigured case or transfer leadership.
 * @param {string} caseId
 * @param {string} policeId
 * @returns {Promise<Object>}
 */
export async function assignCaseLead(caseId, policeId) {
  return apiFetch(`/case-access/${caseId}/lead`, {
    method: 'POST',
    body: JSON.stringify({ police_id: policeId }),
  });
}
