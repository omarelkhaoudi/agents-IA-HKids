# Knowledge Base

## Purpose

The knowledge base supplies policy and reference text for RAG. Documents live in PostgreSQL (`knowledge_documents`) and are linked to agents via `agent_document_links`.

## Document fields

| Field | Notes |
|-------|-------|
| `id` | e.g. `doc-001` |
| `title`, `category`, `description` | Catalog |
| `tags` | Array used in keyword retrieval |
| `status` | `active` \| `review` \| `archived` |
| `author`, `fileType` | `PDF` \| `DOCX` \| `XLSX` \| `TXT` \| `CSV` |
| `sourceFileName`, `size` | Metadata |
| `content`, `priority` | Indexed body (content synthesized on create/update) |

## Important: upload model

`POST /api/documents` accepts **JSON metadata**, not multipart file bytes. The service builds searchable `content` from title, description, category, tags, author, and file type (`buildDocumentContent`). Prefer accurate descriptions and tags so retrieval remains useful.

After create/update/delete, `retrievalService.scheduleRefreshIndex()` rebuilds the in-memory index.

## Seeded documents

| ID | Title | Category | Status |
|----|-------|----------|--------|
| `doc-001` | Parent Enrollment Policy | Administration | active |
| `doc-002` | Supplier Contact Directory | Procurement | review |
| `doc-003` | Registration Checklist | Operations | active |
| `doc-004` | Monthly Billing Notes | Finance | archived |
| `doc-005` | Transport Allocation Export | Logistics | active |

Bodies/priorities: `default-document-sources.js`.

## How to add or update documents

### UI

1. Open **Knowledge Base** (`/knowledge-base`).
2. Create or edit a document (Employee+ for writes).
3. Set status to `active` when it should be retrieved.
4. Link the document id on the relevant agent(s).

### API

| Method | Path | Role |
|--------|------|------|
| GET | `/api/documents` | Authenticated |
| POST | `/api/documents` | Employee+ |
| PUT | `/api/documents/:id` | Employee+ |
| DELETE | `/api/documents/:id` | Employee+ |

Search without chat: `POST /api/retrieval/search` (Employee+).

## Retrieval pipeline (hybrid)

Strategy label: `hybrid-semantic-keyword`

1. **Chunk** — ~420 chars, 60 overlap (`DocumentChunker`)
2. **Embed** — deterministic hash vectors by default (`EMBEDDING_PROVIDER=mock`)
3. **KeywordRetriever** — token matches on content/title/tags/category
4. **SemanticRetriever** — cosine similarity (topK 8)
5. **HybridRetriever** — merge by chunk id
6. **ContextRanker** — weights: semantic 0.45, keyword 0.25, priority 0.1, recency 0.1, tag 0.1 (topK 5)

Chat messages automatically call retrieval and inject ranked context into the prompt.

## Embedding configuration

| Variable | Default |
|----------|---------|
| `EMBEDDING_PROVIDER` | `mock` |
| `EMBEDDING_MODEL` | `mock-hash-v1` |
| `OPENAI_API_KEY` | Required only when `EMBEDDING_PROVIDER=openai`; default path uses hash embeddings |

## Related docs

- [Prompt-System.md](./Prompt-System.md)
- [Architecture.md](./Architecture.md)
- [API.md](./API.md)
