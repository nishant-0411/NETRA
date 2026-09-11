import { apiFetch } from './apiClient';

/**
 * Sends question query to backend NETRA AI Copilot (/copilot/chat)
 * 
 * @param {string} question 
 * @param {string} [caseId] 
 * @returns {Promise<Object>} Response object containing answer
 */
export async function sendCopilotChat(question, caseId) {
  try {
    const data = await apiFetch('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({
        question,
        case_id: caseId,
      }),
    });
    return data;
  } catch (err) {
    console.warn('[copilotService] Backend copilot API call failed:', err.message);
    throw err;
  }
}
