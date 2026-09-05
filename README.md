# NETRA

### AI-Driven Criminal Network Intelligence Platform

> **Discover hidden entities. Connect fragmented evidence. Reveal
> criminal networks.**

**Knowledge Graphs • NLP • Graph Analytics • RAG • LLM Agents • ETL**

------------------------------------------------------------------------

## 🔎 Overview

**NETRA** is an AI-driven criminal network intelligence platform
designed to transform fragmented investigation data into a connected,
intelligence-rich view of criminal activity.

Traditional investigations often require officers to examine FIRs, case
diaries, call records, vehicle information, financial records,
social-media intelligence and other sources separately.

NETRA brings these heterogeneous sources together and helps
investigators move from:

> **Case-by-Case Investigation → Network-Level Investigation**

The platform extracts entities and relationships from structured and
unstructured data, stores investigation information, and prepares it for
analysis through a unified **Knowledge Graph**.

------------------------------------------------------------------------

## 🎯 Core Objectives

-   Correlate data from multiple investigation sources
-   Extract meaningful entities from unstructured documents
-   Discover relationships that are difficult to identify manually
-   Connect information across multiple cases
-   Identify hidden connectors and important network nodes
-   Support investigators with graph-based intelligence
-   Provide an AI-assisted interface for investigation and analysis

------------------------------------------------------------------------

## 🧩 Data Sources

  -----------------------------------------------------------------------
  Data Type                           Examples
  ----------------------------------- -----------------------------------
  📄 Unstructured                     FIRs, case diaries, investigation
                                      reports, interrogation reports,
                                      search/seizure memos

  📊 Structured                       Call records, vehicle data, account
                                      information, license data, person
                                      records

  🌐 Semi-Structured                  Social-media intelligence and other
                                      generated records

  📍 Location                         Locations extracted from documents,
                                      records and IP-based sources
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 🏗️ High-Level Architecture

``` mermaid
flowchart LR
    A[Investigation Data] --> B{Data Type}
    B -->|Existing Structured| C[MongoDB-1<br/>Master Repository]
    B -->|Existing Unstructured| D[ETL Pipeline]
    B -->|New PDF / Image| E[FastAPI Upload]
    D --> F[Structured Output]
    E --> G[Temporary File]
    G --> D
    F --> C
    F --> H[MongoDB-2<br/>Active Investigation Workspace]
    H --> I[Graph Service]
    C --> I
    I --> J[(Neo4j<br/>Knowledge Graph)]
    J --> K[Graph Analytics]
    J --> L[RAG]
    J --> M[LLM Agents]
    K --> N[Investigator Interface]
    L --> N
    M --> N
```

------------------------------------------------------------------------

## 🗄️ Data Architecture

NETRA separates historical/master information from active investigation
data.

### MongoDB-1 --- Master / Historical Repository

MongoDB-1 contains the existing structured dataset and processed
historical unstructured information.

Current collections:

``` text
persons
phones
vehicles
accounts
call_records
licenses
```

Existing unstructured documents are processed through the ETL pipeline
before being stored as structured information.

### MongoDB-2 --- Active Investigation Workspace

MongoDB-2 is used for **new/future investigations**.

Common collections:

``` text
cases
documents
entities
relationships
events
```

A separate collection is **not** created for every case. Instead,
documents are associated using:

``` text
case_id
document_id
```

This keeps the data model scalable and allows entities to be connected
across investigations.

------------------------------------------------------------------------

## 🔄 ETL Pipeline

NETRA uses an ETL layer to transform unstructured investigation material
into structured intelligence.

``` mermaid
flowchart LR
    A[FIR / PDF / Image / Report] --> B[ETL Service]
    B --> C[Text Extraction]
    C --> D[NLP / Entity Extraction]
    D --> E[Relationship Extraction]
    E --> F[Event Extraction]
    F --> G[Structured Dictionary]
    G --> H[MongoDB]
    G --> I[Knowledge Graph]
```

### ETL Responsibilities

-   Read investigation documents
-   Extract relevant information
-   Identify entities
-   Identify relationships
-   Extract events and contextual information
-   Return structured, JSON-compatible data

Typical output:

``` json
{
  "persons": [],
  "phones": [],
  "vehicles": [],
  "accounts": [],
  "locations": [],
  "organizations": [],
  "relationships": [],
  "events": []
}
```

The ETL returns data to the backend; **database persistence remains a
backend responsibility**.

------------------------------------------------------------------------

## 📥 New Document Flow

When an investigator uploads a new PDF or image:

``` mermaid
sequenceDiagram
    participant U as Investigator
    participant API as FastAPI
    participant DS as Document Service
    participant ETL as ETL Service
    participant E as ETL Pipeline
    participant DB as MongoDB-2

    U->>API: Upload document
    API->>DS: Process upload
    DS->>DS: Validate & save temporarily
    DS->>ETL: process_document(...)
    ETL->>E: Run ETL
    E-->>ETL: Structured dictionary
    ETL-->>DS: Return processed data
    DS->>DB: Store structured information
    DS->>DS: Delete temporary file
    DS-->>API: Processing response
    API-->>U: Result
```

**Original uploaded files are temporary.** They are processed and
removed after successful processing rather than being permanently stored
as raw documents.

------------------------------------------------------------------------

## 🕸️ Knowledge Graph

The processed investigation data will ultimately be represented as a
unified graph in **Neo4j**.

``` text
                    ┌──────────────┐
                    │    Person    │
                    └──────┬───────┘
                           │ OWNS
                           ▼
                    ┌──────────────┐
                    │   Vehicle    │
                    └──────┬───────┘
                           │ USED_IN
                           ▼
                    ┌──────────────┐
                    │    Event     │
                    └──────┬───────┘
                           │ OCCURRED_AT
                           ▼
                    ┌──────────────┐
                    │   Location   │
                    └──────────────┘

Person ──USES──> Phone ──CALLED──> Phone
Person ──OWNS──> Account
Person ──CONNECTED_TO──> Person
```

The goal is a **unified network across cases**, allowing the same
real-world entity to connect information from different investigations.

------------------------------------------------------------------------

## 🧠 Intelligence Layer

### 🔗 Knowledge Graph

Represents entities and relationships as a connected investigation
network.

### 📈 Graph Analytics

Helps identify highly connected nodes, important intermediaries, network
clusters and potential hidden connectors.

### 🔍 RAG

Retrieves relevant investigation information to support grounded AI
responses.

### 🤖 LLM-Powered Agents

Provides an AI layer for investigation-oriented reasoning and
interaction with the underlying intelligence.

### 📝 NLP

Processes unstructured documents and extracts useful entities,
relationships and events.

------------------------------------------------------------------------

## 🧱 Project Structure

``` text
NETRA/
│
├── apps/
│   └── backend/
│       ├── app/
│       │   ├── api/
│       │   ├── core/
│       │   ├── db/
│       │   ├── models/
│       │   ├── schemas/
│       │   ├── services/
│       │   │   ├── document_service.py
│       │   │   ├── etl_service.py
│       │   │   ├── graph_service.py
│       │   │   ├── nlp_service.py
│       │   │   └── rag_service.py
│       │   ├── workers/
│       │   └── main.py
│       │
│       └── scripts/
│           ├── load_master_data.py
│           └── load_master_unstructured.py
│
├── ai/
│   ├── agents/
│   ├── chains/
│   ├── prompts/
│   └── rag/
│
├── etl/
│   └── ...
│
├── infrastructure/
│   └── neo4j/
│
├── data/
│   ├── structured/
│   └── unstructured/
│
├── packages/
│   └── shared/
│
├── pyproject.toml
├── README.md
└── .gitignore
```

------------------------------------------------------------------------

## ⚙️ Technology Stack

  Layer                Technology
  -------------------- ---------------------------------------
  Backend              Python, FastAPI
  Database             MongoDB
  Knowledge Graph      Neo4j
  AI / LLM             LLM-powered agents
  NLP                  NLP / information extraction pipeline
  Retrieval            RAG
  ETL                  Custom Python ETL pipeline
  Package Management   `uv`
  Frontend             React / Vite
  Version Control      Git / GitHub

------------------------------------------------------------------------

## 🚀 Getting Started

### 1. Clone the repository

``` bash
git clone https://github.com/nishant-0411/NETRA.git
cd NETRA
```

### 2. Install dependencies

``` bash
uv sync
```

### 3. Configure environment variables

Create a `.env` file:

``` env
MONGO_URI=your_mongodb_connection_string
```

> Never commit `.env` or credentials to Git.

### 4. Load existing structured data

Place the structured JSON files inside:

``` text
data/structured/
```

Then run:

``` bash
uv run python -m apps.backend.scripts.load_master_data
```

This loads the existing structured dataset into **MongoDB-1**.

### 5. Process existing unstructured data

Place case folders inside:

``` text
data/unstructured/
├── CASE-0007/
├── CASE-0008/
└── CASE-0009/
```

After ETL integration is ready:

``` bash
uv run python -m apps.backend.scripts.load_master_unstructured
```

This processes the existing unstructured dataset and loads the resulting
structured information into **MongoDB-1**.

------------------------------------------------------------------------

## 🔐 Security & Data Handling

-   Credentials are stored in environment variables
-   `.env` should never be committed
-   Uploaded documents are processed through temporary storage
-   Raw uploaded files are deleted after processing
-   `case_id` and `document_id` maintain provenance
-   Historical and active investigation data are logically separated
-   The graph is designed to preserve cross-case relationships

------------------------------------------------------------------------

## 🧭 Investigation Philosophy

  -----------------------------------------------------------------------
  Traditional Approach                NETRA Approach
  ----------------------------------- -----------------------------------
  Case-by-case investigation          **Network-level investigation**

  Focus on known suspects             **Discover hidden connectors**

  Follow the incident                 **Follow the network**

  Examine records individually        **Correlate heterogeneous
                                      evidence**

  Manual relationship discovery       **Graph-assisted relationship
                                      discovery**
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 🗺️ Development Roadmap

``` text
[✓] Project architecture
      ↓
[✓] MongoDB-1 setup
      ↓
[✓] Existing structured data loader
      ↓
[✓] MongoDB-2 architecture
      ↓
[✓] ETL service interface
      ↓
[ ] Existing unstructured ETL integration
      ↓
[ ] New document upload + ETL integration
      ↓
[ ] Active investigation data model
      ↓
[ ] MongoDB → Neo4j graph pipeline
      ↓
[ ] Graph analytics
      ↓
[ ] RAG
      ↓
[ ] LLM-powered investigation agents
      ↓
[ ] End-to-end investigation workflow
```

------------------------------------------------------------------------

## 👥 Team

NETRA is being developed collaboratively across:

-   Frontend
-   Backend
-   AI / NLP
-   ETL & Data Engineering
-   Knowledge Graph & Analytics

------------------------------------------------------------------------

## ⚠️ Disclaimer

NETRA is an investigation-support and intelligence-analysis platform.
Its outputs are intended to assist human investigators and should not be
treated as automatic determinations of guilt, identity, or criminal
responsibility.

------------------------------------------------------------------------

```{=html}
<p align="center">
```
`<b>`{=html}NETRA --- From Fragmented Evidence to Connected
Intelligence.`</b>`{=html}
```{=html}
</p>
```
