const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchCaseGraph(caseId) {
  const res = await fetch(`${API_BASE}/api/graph/${caseId}`);
  if (!res.ok) throw new Error('Failed to fetch graph');
  return res.json();
}

export async function fetchFullGraph() {
  const res = await fetch(`${API_BASE}/api/graph/full`);
  if (!res.ok) throw new Error('Failed to fetch full graph');
  return res.json();
}

export async function fetchNodeDetail(nodeId) {
  const res = await fetch(`${API_BASE}/api/node/${encodeURIComponent(nodeId)}`);
  if (!res.ok) throw new Error('Failed to fetch node detail');
  return res.json();
}

export async function fetchEdgeDetail(edgeId) {
  const res = await fetch(`${API_BASE}/api/edge/${encodeURIComponent(edgeId)}`);
  if (!res.ok) throw new Error('Failed to fetch edge detail');
  return res.json();
}

export async function fetchSuspects(caseId) {
  const res = await fetch(`${API_BASE}/api/suspects/${caseId}`);
  if (!res.ok) throw new Error('Failed to fetch suspects');
  return res.json();
}

export async function exploreNode(nodeId, depth = 2) {
  const res = await fetch(`${API_BASE}/api/explore/${encodeURIComponent(nodeId)}?depth=${depth}`);
  if (!res.ok) throw new Error('Failed to explore node');
  return res.json();
}

export async function sendChatMessage(question) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error('Chat request failed');
  return res.json();
}

export async function uploadDocument(file, caseId, metadata = {}) {
  const form = new FormData();
  form.append('file', file);
  form.append('case_id', caseId);
  if (metadata.document_type) form.append('document_type', metadata.document_type);
  if (metadata.description) form.append('description', metadata.description);
  if (metadata.uploaded_by) form.append('uploaded_by', metadata.uploaded_by);

  const res = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}
