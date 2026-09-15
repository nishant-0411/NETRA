# NETRA API Reference

Base URL: `http://localhost:8000` (or `VITE_API_URL`).

This reference covers every router registered by `apps/backend/app/main.py`.
`🔒` marks an endpoint that requires an `Authorization: Bearer <access_token>`
header.

## Quick rules

- JSON APIs: `Content-Type: application/json`
- Login: `application/x-www-form-urlencoded`
- File uploads: `multipart/form-data`
- Protected APIs: `Authorization: Bearer <access_token>`
- Raised HTTP errors use `{ "detail": "Reason" }`. The copilot and graph
  read endpoints may instead return a successful fallback payload as described
  in their sections.
- Interactive API explorer: [`/docs`](/docs), [`/redoc`](/redoc), [`/openapi.json`](/openapi.json)

### Status codes

`200` is a successful read or mutation, `201` is a created account, lead
assignment, or access request, `400` is an invalid upload, `401` is an absent,
invalid, expired, or logged-out token, `403` is an authorization failure,
`404` is a missing resource, `409` is a conflicting state, `422` is invalid
request input, `500` is an unexpected document-processing failure, and `503`
is an unavailable graph-analysis service. Individual endpoints can return a
subset of these statuses.

## Authentication

1. Register with `POST /auth/register`.
2. Log in with `POST /auth/login` and save `access_token`.
3. Send the token as a Bearer token to protected APIs.
4. Log out with `POST /auth/logout` to revoke that session.

Routes that use the authenticated-user dependency (`/auth/me`, graph, and case
access routes) validate the active MongoDB session, JWT signature and expiry,
JWT session ID, and user account. Tokens expire one hour after login. Logout
and account deletion also require an active session.

### Shared response: `User`

```json
{
  "id": "66e6c824fd9cb67fd8ed21d3",
  "username": "akbanerjee",
  "email": "ak.banerjee@police.gov.in",
  "police_id": "SI-88492-DL",
  "rank": "Sub-Inspector (SI)",
  "state": "Delhi",
  "department": "Crime Branch",
  "case_access_ids": ["CASE-0001"]
}
```

`case_access_ids` is calculated from case access records; it is not duplicated in user documents.

### Authentication endpoints

| API | Input | Response | Description |
| --- | --- | --- | --- |
| `POST /auth/register` | [Register JSON](#register-json) | `201` → `User` | Creates a police investigator account. |
| `POST /auth/login` | [Login form](#login-form) | `200` → `{access_token, token_type, user: User}` | Creates a one-hour server-side session. |
| `POST /auth/logout` 🔒 | No body | `200` → `{message}` | Revokes the current session. |
| `GET /auth/me` 🔒 | No body | `200` → `User` | Gets the authenticated officer. |
| `DELETE /auth/account` 🔒 | No body | `200` → `{message}` | Deletes the current user and all their sessions. |

#### Register JSON

```json
{
  "username": "akbanerjee",
  "email": "ak.banerjee@police.gov.in",
  "password": "at-least-8-characters",
  "police_id": "SI-88492-DL",
  "rank": "Sub-Inspector (SI)",
  "state": "Delhi",
  "department": "Crime Branch"
}
```

All fields are required. `username` is 3–50 characters; `password` is 8–128 characters. Username, email, and police ID must be unique.

Allowed ranks: `Constable`, `Head Constable`, `Assistant Sub-Inspector (ASI)`, `Sub-Inspector (SI)`, `Inspector`, `Station House Officer (SHO)`, `Assistant Commissioner of Police (ACP)`, `Deputy Superintendent of Police (DSP)`, `Additional Superintendent of Police (Addl. SP)`, `Superintendent of Police (SP)`, `Deputy Commissioner of Police (DCP)`, `Additional Commissioner of Police (Addl. CP)`, `Commissioner of Police (CP)`, `Deputy Inspector General (DIG)`, `Inspector General (IG)`, `Additional Director General of Police (ADGP)`, `Director General of Police (DGP)`.

Errors: `409` duplicate account field; `422` invalid input/rank.

#### Login form

```text
username=akbanerjee&password=at-least-8-characters
```

`username` accepts either username or email. Errors: `401` invalid credentials; `403` disabled account.

## Cases

All case endpoints require a bearer token. The API returns only dossiers for which the signed-in officer has case access; case data is read from MongoDB, not the frontend fixture.

| API | Input | Response | Description |
| --- | --- | --- | --- |
| `POST /cases` 🔒 | [Create-case JSON](#create-case-json) | `201` → `Case` | Opens a dossier and assigns the caller as its initial lead. |
| `GET /cases` 🔒 | None | `200` → `Case[]` | Lists the caller’s authorised cases. |
| `GET /cases/{case_id}` 🔒 | Path: `case_id` | `200` → `Case` | Gets one authorised dossier. |

### Create-case JSON

```json
{
  "case_title": "Operation New Horizon",
  "fir_number": "FIR-2026/001",
  "police_station": "Cyber Crime Police Station",
  "crime_type": "Cyber financial fraud",
  "case_id": "CASE-2026-001",
  "threat_level": "HIGH",
  "ipc_sections": ["IPC 420", "IT Act Sec 66D"],
  "master_plot": "Initial complaint and known facts."
}
```

`case_id` is optional; the server generates one when it is omitted. The creator becomes the lead investigator and receives the initial case access record.

### Shared response: `Case`

Case documents are flexible. Responses also include the current `lead_investigator`, `lead_investigator_police_id`, and `authorised_personnel_count` derived from the case-access record.

```json
{
  "case_id": "CASE-0001",
  "case_title": "Operation Chakra",
  "fir_number": "FIR-2024/0412/CYB",
  "police_station": "Cyber Crime Special Cell",
  "investigating_officer": "Sub-Inspector A. K. Banerjee",
  "crime_type": "Organized Cyber Financial Fraud",
  "ipc_sections": ["IPC 420 (Cheating)", "IT Act Sec 66D"],
  "threat_level": "CRITICAL",
  "suspects": [],
  "victims": [],
  "witnesses": [],
  "vehicles": [],
  "phones": [],
  "weapons": [],
  "edges": []
}
```

## Documents

These endpoints require a bearer token and case access. Accepted files: PDF, TXT (`text/plain`), JPEG, PNG, and WEBP; maximum size: 10 MB per file. TXT files are read directly as text during extraction.

| API | Input | Response | Description |
| --- | --- | --- | --- |
| `POST /documents/upload` 🔒 | [Single-upload form](#upload-form-fields) | `200` → `Document` | Uploads, processes, stores, and graph-syncs one file. |
| `POST /documents/upload-multiple` 🔒 | [Multi-upload form](#upload-form-fields) | `200` → `BatchDocument` | Processes multiple files with shared metadata; each file remains an independent MongoDB document. |
| `GET /documents/{case_id}` 🔒 | Path: `case_id` | `200` → `{case_id, documents: object[]}` | Lists raw stored document metadata. |

### Upload form fields

| Field | Single | Multiple | Required | Format |
| --- | --- | --- | --- | --- |
| File field | `file` | `files` | Yes | Accepted file type, max 10 MB each |
| `case_id` | ✓ | ✓ | Yes | Target case ID |
| `document_type` | ✓ | ✓ | No | Text |
| `description` | ✓ | ✓ | No | Text |
| `uploaded_by` | ✓ | ✓ | No | Officer name or police ID |
| `tags` | ✓ | ✓ | No | JSON-string array (`["field"]`) or comma-separated text |
| `source` | ✓ | ✓ | No | Evidence source |

### Shared response: `Document`

```json
{
  "document_id": "80f097c7-8cba-4db9-b7e0-0e4e4e70d841",
  "case_id": "CASE-0001",
  "filename": "case_diary.pdf",
  "content_type": "application/pdf",
  "file_size": 248120,
  "document_type": "Case Diary",
  "description": "Field diary entry",
  "uploaded_by": "SI-88492-DL",
  "uploaded_at": "2026-09-15T10:30:00+00:00",
  "tags": ["diary", "field"],
  "source": "CCTNS Portal",
  "processing_status": "completed",
  "message": "Document processed and stored successfully."
}
```

### Shared response: `BatchDocument`

```json
{
  "case_id": "CASE-0001",
  "total_files": 2,
  "successful": 1,
  "failed": 1,
  "documents": [{ "document_id": "...", "processing_status": "completed" }],
  "errors": [{ "filename": "bad.txt", "error": "Unsupported file type..." }]
}
```

Single upload errors: `400` invalid file; `500` ETL, storage, or graph-sync failure.

## Graph and analytics

Both endpoints require a valid Bearer token **and** case access. The caller's `police_id` must appear in that case's `police_ids` list. `401` means no valid session; `403` means no case access.

| API | Input | Response | Description |
| --- | --- | --- | --- |
| `GET /api/cases/{case_id}/graph` 🔒 | Path: `case_id` | `200` → `Graph` | Gets the visible Neo4j subgraph. |
| `GET /api/cases/{case_id}/analytics/{analysis}` 🔒 | Paths: `case_id`, `analysis` | `200` → `Analytics` | Runs case-scoped community, centrality, or anomaly analysis. |

### `Graph` response

```json
{
  "case_id": "CASE-0001",
  "nodes": [
    { "id": "4:1af...:0", "labels": ["Person"], "data": { "person_id": "P-101", "name": "Vikram Mondal" } }
  ],
  "edges": [
    { "source": "4:1af...:0", "target": "4:1af...:1", "type": "USES", "data": {} }
  ]
}
```

On a Neo4j failure after authorization, the graph endpoint returns `200` with empty lists plus `status: "error"` and `error`.

### `Analytics` response

`analysis` must be one of the following values:

| `analysis` | Response field | Item format |
| --- | --- | --- |
| `communities` | `communities` | `{node_id, name, labels, community_id}` |
| `centrality` | `central_nodes` | `{node_id, name, labels, score}` |
| `anomalies` | `anomalies` | `{node_id, name, labels, degree, reason}` |

Every successful response has the form:

```json
{ "status": "success", "case_id": "CASE-0001", "communities": [] }
```

Errors: `404` unsupported `analysis`; `503` Neo4j/GDS analysis failure.

## Case access management

All endpoints below require a Bearer token. Every case has one `lead_investigator_police_id` and one `police_ids` list. The lead grants, transfers, or revokes collaborator access.

| API | Input | Response | Description |
| --- | --- | --- | --- |
| `GET /case-access/{case_id}` 🔒 | Path: `case_id` | `200` → `AccessSummary` | Any signed-in officer can see the lead and their own access status. |
| `GET /case-access/lead/workload` 🔒 | None | `200` → `LeadWorkload` | Shows workload for the current lead. |
| `POST /case-access/{case_id}/lead` 🔒 | [Lead JSON](#lead-json) | `201` → `AccessSummary` | Claims an unassigned case or transfers leadership. |
| `POST /case-access/{case_id}/requests` 🔒 | [Request JSON](#request-json) | `201` → `AccessRequest` | Requests access from the lead. |
| `GET /case-access/{case_id}/requests` 🔒 | Path: `case_id` | `200` → `{case_id, requests: AccessRequestQueueItem[]}` | Lists pending requests; lead only. |
| `POST /case-access/{case_id}/requests/{request_id}/decision` 🔒 | [Decision JSON](#decision-json) | `200` → `{case_id, request_id, status, police_id}` | Approves/rejects a request; lead only. |
| `DELETE /case-access/{case_id}/personnel/{police_id}` 🔒 | Paths: `case_id`, `police_id` | `200` → `{case_id, revoked_police_id, status}` | Revokes a collaborator; lead only. |

### `AccessSummary` response

```json
{
  "case_id": "CASE-0001",
  "lead_investigator": {
    "police_id": "SI-88492-DL",
    "username": "akbanerjee",
    "rank": "Sub-Inspector (SI)",
    "department": "Crime Branch"
  },
  "has_access": true,
  "is_lead": true,
  "authorised_personnel_count": 3
}
```

### `LeadWorkload` response

```json
{
  "lead_police_id": "SI-88492-DL",
  "lead_case_count": 2,
  "unique_collaborator_count": 4,
  "cases": [{ "case_id": "CASE-0001", "working_personnel_count": 3, "collaborator_count": 2 }]
}
```

### Lead JSON

```json
{ "police_id": "SI-88492-DL" }
```

For an unconfigured case, `police_id` must be the current officer. For a configured case, only its current lead can transfer leadership.

### Request JSON

```json
{ "message": "I am assigned to analyse the CDR evidence." }
```

`message` is optional and limited to 500 characters.

### `AccessRequest` response

```json
{
  "id": "66e6d203fd9cb67fd8ed229c",
  "case_id": "CASE-0001",
  "requester_police_id": "HC-321-DL",
  "message": "I am assigned to analyse the CDR evidence.",
  "status": "pending",
  "created_at": "2026-09-15T10:30:00+00:00"
}
```

`POST /case-access/{case_id}/requests` returns the object above. The pending
queue returned by `GET /case-access/{case_id}/requests` has a deliberately
different requester field and omits `status`:

```json
{
  "case_id": "CASE-0001",
  "requests": [
    {
      "id": "66e6d203fd9cb67fd8ed229c",
      "case_id": "CASE-0001",
      "requester": {
        "police_id": "HC-321-DL",
        "username": "rsharma",
        "rank": "Head Constable",
        "department": "Crime Branch"
      },
      "message": "I am assigned to analyse the CDR evidence.",
      "created_at": "2026-09-15T10:30:00+00:00"
    }
  ]
}
```

### Decision JSON

```json
{ "approve": true }
```

`true` adds the officer to `police_ids`; `false` rejects the request. The lead cannot revoke themselves—transfer leadership first.

Common access errors: `403` not lead/no access; `404` no configured case, request, or collaborator; `409` duplicate request, existing access, or lead self-revocation; `422` invalid request ID or body.

## Copilot

This endpoint is currently public and does not enforce case access.

| API | Input | Response | Description |
| --- | --- | --- | --- |
| `POST /copilot/chat` | [Chat JSON](#chat-json) | `200` → `{answer, case_id}` | Asks the graph copilot. |

### Chat JSON

```json
{
  "question": "Which people are connected to the mule accounts?",
  "case_id": "CASE-0001"
}
```

`question` is required; `case_id` is optional. Dependency failures return `200` with `{answer, error, is_fallback: true}`.

## Example authenticated request

```bash
curl --request GET 'http://localhost:8000/api/cases/CASE-0001/graph' \
  --header 'Authorization: Bearer <access_token>'
```

For a document upload, send a multipart request rather than JSON:

```bash
curl --request POST 'http://localhost:8000/documents/upload' \
  --form 'file=@case_diary.pdf;type=application/pdf' \
  --form 'case_id=CASE-0001' \
  --form 'tags=["diary","field"]'
```

## Not exposed

`apps/backend/app/api/routes/entities.py` and `apps/backend/app/api/routes/network.py` contain no routes and are not included by the FastAPI application. There are no entity- or network-prefixed REST endpoints in the current backend; network information is available through the case graph and analytics endpoints.
