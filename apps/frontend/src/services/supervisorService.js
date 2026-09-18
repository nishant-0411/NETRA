import { apiFetch } from './apiClient';

/**
 * Fetch all cases in the police station / system with detailed assignment metadata.
 * @param {Object} [filters] - { status, priority, officer_id, search }
 */
export async function getSupervisorCases(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.officer_id) params.append('officer_id', filters.officer_id);
  if (filters.search) params.append('search', filters.search);

  const queryString = params.toString();
  const url = `/supervisor/cases${queryString ? `?${queryString}` : ''}`;
  return apiFetch(url);
}

/**
 * Fetch unassigned cases requiring investigator allocation.
 */
export async function getUnassignedCases() {
  return apiFetch('/supervisor/unassigned');
}

/**
 * Fetch all officers in the police station along with their case workload metrics.
 * @param {string} [department]
 */
export async function getStationOfficers(department) {
  const url = department ? `/supervisor/officers?department=${encodeURIComponent(department)}` : '/supervisor/officers';
  return apiFetch(url);
}

/**
 * Assign an unassigned case to a police officer.
 * @param {string} caseId
 * @param {string} officerPoliceId
 */
export async function assignCase(caseId, officerPoliceId) {
  return apiFetch(`/supervisor/cases/${caseId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ officer_police_id: officerPoliceId }),
  });
}

/**
 * Transfer an assigned case to a new officer with optional reason.
 * @param {string} caseId
 * @param {string} newOfficerPoliceId
 * @param {string} [reason]
 */
export async function transferCase(caseId, newOfficerPoliceId, reason = '') {
  return apiFetch(`/supervisor/cases/${caseId}/transfer`, {
    method: 'POST',
    body: JSON.stringify({
      new_officer_police_id: newOfficerPoliceId,
      reason: reason.trim() || null,
    }),
  });
}

/**
 * Fetch assignment and transfer history timeline.
 * @param {string} [caseId]
 */
export async function getAssignmentHistory(caseId) {
  const url = caseId ? `/supervisor/history?case_id=${encodeURIComponent(caseId)}` : '/supervisor/history';
  return apiFetch(url);
}

/**
 * Fetch supervisor audit logs.
 * @param {number} [limit=100]
 */
export async function getSupervisorAuditLogs(limit = 100) {
  return apiFetch(`/supervisor/audit-logs?limit=${limit}`);
}
