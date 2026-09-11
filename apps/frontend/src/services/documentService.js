/**
 * Project NETRA - Document Upload & Ingestion Service
 * Handles client-side validation, multipart packaging, and API communication 
 * with the FastAPI /documents/upload endpoints.
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

export const DOCUMENT_TYPES = [
  { value: 'FIR', label: 'First Information Report (FIR)' },
  { value: 'Interrogation Report', label: 'Suspect Interrogation Report' },
  { value: 'Search & Seizure Memo', label: 'Search & Seizure Memo' },
  { value: 'Case Diary', label: 'Daily Case Diary (CD)' },
  { value: 'Cyber Financial Trail', label: 'Cyber Financial & Bank Trail' },
  { value: 'Forensic Ballistics', label: 'Forensic & Ballistics Report' },
  { value: 'CDR/IPDR Analysis', label: 'CDR / IPDR Telecom Records' },
  { value: 'Intelligence Memo', label: 'Confidential Intelligence Memo' },
];

export const EVIDENCE_SOURCES = [
  { value: 'CCTNS Portal', label: 'CCTNS National Police Portal' },
  { value: 'State Special Task Force (STF)', label: 'State Special Task Force (STF)' },
  { value: 'Cyber Crime Police Station', label: 'Cyber Crime Police Station' },
  { value: 'Field QRT Unit', label: 'Field Quick Reaction Team (QRT)' },
  { value: 'Financial Intelligence Unit (FIU)', label: 'Financial Intelligence Unit (FIU)' },
  { value: 'Judicial Court Registry', label: 'Judicial Court Registry' },
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Validates a candidate document file before network transmission
 * @param {File} file 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDocument(file) {
  if (!file) {
    return { valid: false, error: 'No file selected for ingestion.' };
  }

  // Size validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the strict 10 MB tactical ingestion limit.`,
    };
  }

  // Type validation
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.type);
  const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);

  if (!isMimeAllowed && !isExtAllowed) {
    return {
      valid: false,
      error: `Unsupported file format "${ext || file.type}". Only PDF, JPEG, PNG, and WEBP evidence files are accepted.`,
    };
  }

  return { valid: true };
}

/**
 * Formats bytes to human-readable size string
 * @param {number} bytes 
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Uploads an individual investigative document to the backend ETL service
 * 
 * @param {Object} params
 * @param {File} params.file - Evidence file
 * @param {string} params.caseId - Target investigation case (e.g. 'CASE-0001')
 * @param {string} [params.documentType] - Type classification
 * @param {string} [params.description] - Context/summary notes
 * @param {string} [params.uploadedBy] - Officer identifier
 * @param {string[]|string} [params.tags] - Classification tags
 * @param {string} [params.source] - Originating agency
 * @returns {Promise<Object>} Processed document and ETL extraction status
 */
export async function uploadDocument({
  file,
  caseId,
  documentType = 'FIR',
  description = '',
  uploadedBy = 'Sub-Inspector A. K. Banerjee',
  tags = [],
  source = 'CCTNS Portal',
}) {
  // Pre-flight client validation
  const validation = validateDocument(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (!caseId) {
    throw new Error('Case ID is required to link evidence to an active dossier.');
  }

  // Prepare multipart form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('case_id', caseId);

  if (documentType) formData.append('document_type', documentType);
  if (description) formData.append('description', description);
  if (uploadedBy) formData.append('uploaded_by', uploadedBy);
  if (source) formData.append('source', source);

  // Normalize tags to comma-delimited string as supported by backend documents.py
  if (tags) {
    const formattedTags = Array.isArray(tags) 
      ? tags.filter(Boolean).join(', ') 
      : String(tags);
    if (formattedTags.trim()) {
      formData.append('tags', formattedTags);
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
      // Note: do NOT set Content-Type header; fetch handles boundary automatically
    });

    if (!response.ok) {
      let errorMessage = `Server rejected upload with HTTP status ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorMessage = typeof errorJson.detail === 'string' 
            ? errorJson.detail 
            : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Fall back to default status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    // Check if network failed because server is offline
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      console.warn('Backend server not reachable on', API_BASE_URL, '- falling back to tactical simulation response');
      // Tactical simulated fallback for local UI preview
      return simulateDocumentIngestion({
        file,
        caseId,
        documentType,
        description,
        uploadedBy,
        tags: Array.isArray(tags) ? tags : [tags],
        source,
      });
    }
    throw err;
  }
}

/**
 * Simulates ETL ingestion when backend service is offline during local UI development
 */
async function simulateDocumentIngestion(payload) {
  // Simulate network & LangGraph entity extraction delay
  await new Promise((resolve) => setTimeout(resolve, 1800));

  const ext = '.' + payload.file.name.split('.').pop().toLowerCase();
  const mockEntities = Math.floor(Math.random() * 4) + 3;
  const mockRelations = Math.floor(Math.random() * 6) + 4;

  return {
    document_id: 'doc-' + Math.random().toString(36).substring(2, 11),
    case_id: payload.caseId,
    filename: payload.file.name,
    content_type: payload.file.type || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg'),
    file_size: payload.file.size,
    document_type: payload.documentType,
    description: payload.description,
    uploaded_by: payload.uploadedBy,
    uploaded_at: new Date().toISOString(),
    tags: payload.tags || ['tactical_evidence'],
    source: payload.source,
    processing_status: 'completed',
    processed_data: {
      entities_extracted: mockEntities,
      relationships_created: mockRelations,
      extracted_entities: [
        { type: 'PERSON', name: 'Identified Suspect ' + Math.floor(Math.random() * 90 + 10), confidence: 0.94 },
        { type: 'PHONE', number: '+91-987' + Math.floor(Math.random() * 9000000 + 1000000), confidence: 0.98 },
        { type: 'VEHICLE', reg: 'DL-01-AB-' + Math.floor(Math.random() * 9000 + 1000), confidence: 0.91 },
      ],
      summary: `Automated LangGraph ingestion extracted ${mockEntities} entities and synthesized ${mockRelations} relational graph links for dossier ${payload.caseId}.`,
    },
    message: 'Document processed and stored successfully (Simulated Local Mode).',
    is_simulated: true,
  };
}

/**
 * Fetches uploaded evidence documents for a given case from backend /documents/{caseId}
 * 
 * @param {string} caseId 
 * @returns {Promise<Array>} List of document records
 */
export async function fetchCaseDocuments(caseId) {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${caseId}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.documents)) {
        return data.documents;
      }
    }
  } catch (err) {
    console.warn(`[documentService] Failed to fetch documents for ${caseId}:`, err.message);
  }
  return [];
}

