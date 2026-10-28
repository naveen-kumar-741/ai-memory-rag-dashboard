# ai-memory-rag-dashboard

> A sleek, dark-mode React dashboard and context inspector component for local multi-tenant RAG and memory systems.

## ✨ Features

- **Real-time SSE Chat:** Reads `/chat/stream` chunks with auto-scrolling and typing indicator state.
- **Live Inspector Pane:** Shows rewritten contextual queries, retrieved user memories, and background task statuses side-by-side.
- **Memory Management:** Dedicated tabs for manual memory creation with importance weighting, Qdrant vector lookups, and conflict/relationship testing (`/classify_memory_relationship` & `/detect_memory_conflict`).
- **Knowledge Base Ingestion:** File upload dropzone supporting custom chunk sizes and overlap controls with full state reset handling (`/add_memory_file_upload`).
- **Configurable Environment:** Edit API Base URL, User ID, and Session ID directly in the header controls at runtime.

---

## ⚡ Prerequisites

To use this React component in your project, ensure you have:

- **Node.js**: `v18.0.0` or higher.
- **React**: `^18.0.0` or `^19.0.0`.
- **Tailwind CSS**: `^4.0.0` (or v3.x) configured in your host project.
- **Backend**: A running instance of the AI Memory + RAG FastAPI backend service (`http://localhost:8000`).

---

## 🚀 Quickstart

### Step 1: Install the Package

Run one of the following commands in your React project root:

```bash
# Using npm
npm install ai-memory-rag-dashboard lucide-react

# Using yarn
yarn add ai-memory-rag-dashboard lucide-react

# Using pnpm
pnpm add ai-memory-rag-dashboard lucide-react
```

### Step 2: Import the Component and Styles

In your React application, make sure to import both the component and the package's compiled stylesheet at your app root (e.g., in `App.tsx`, `main.tsx`, or your root layout file):

```tsx
import React from 'react';
import { AIMemoryDashboard } from 'ai-memory-rag-dashboard';
import 'ai-memory-rag-dashboard/css'; // Crucial for Tailwind styles to apply

export default function DashboardPage() {
  return (
    <div className="h-screen w-full bg-slate-950">
      <AIMemoryDashboard />
    </div>
  );
}
```

---

## ⚙️ Backend API Contracts

The component connects directly to your FastAPI backend (`server.py`) using the endpoints documented below.

| Endpoint                        | Method | Purpose                                                          |
| :------------------------------ | :----- | :--------------------------------------------------------------- |
| `/chat/stream`                  | `POST` | Real-time SSE chat streaming with background memory processing   |
| `/store`                        | `POST` | Stores a manual memory statement via vector upsert               |
| `/search_memory`                | `POST` | Vector search across user active memories in Qdrant              |
| `/update_memory`                | `PUT`  | Updates an existing active memory payload                        |
| `/supersede_memory`             | `PUT`  | Replaces an old memory with a new candidate                      |
| `/detect_memory_conflict`       | `POST` | Evaluates if two memories contradict each other                  |
| `/classify_memory_relationship` | `POST` | Classifies relation as duplicate, update, conflict, or unrelated |
| `/add_memory_file_upload`       | `POST` | Processes `.txt`/`.pdf` files into chunks and indexes to Qdrant  |
| `/search_knowledge`             | `POST` | Reranked vector search across ingested document chunks           |
| `/contextualize_query`          | `POST` | Reformulates follow-up queries using conversation history        |

---

## 📋 API Endpoints, Payloads, & Sample Responses

### 1. Real-Time Chat Stream (`POST /chat/stream`)

**Request Payload:**

```json
{
  "query": "I prefer Python for backend engineering.",
  "history": [
    { "role": "user", "content": "Hi there!" },
    { "role": "assistant", "content": "Hello! How can I help you today?" }
  ],
  "top_k": 3,
  "score_threshold": 0.5,
  "user_id": "alice",
  "session_id": "session_001"
}
```

**Response (`text/event-stream` Chunks):**

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"type": "rewritten_query", "content": "User programming language preference for backend development"}

data: {"type": "retrieved_memories", "content": [{"id": "mem_99", "text": "User works on backend engineering", "score": 0.89}]}

data: {"type": "token", "content": "Got "}

data: {"type": "token", "content": "it! I "}

data: {"type": "token", "content": "will remember that you prefer Python for backend work."}

data: {"type": "done", "status": "success"}
```

---

### 2. Store Manual Memory (`POST /store`)

**Request Payload:**

```json
{
  "text": "User prefers FastAPI over Flask.",
  "user_id": "alice",
  "session_id": "session_001",
  "memory_type": "preference",
  "importance": 0.8
}
```

**Response:**

```json
{
  "status": "success",
  "memory_id": "mem_102",
  "message": "Memory successfully stored.",
  "stored_item": {
    "id": "mem_102",
    "text": "User prefers FastAPI over Flask.",
    "user_id": "alice",
    "session_id": "session_001",
    "memory_type": "preference",
    "importance": 0.8,
    "created_at": "2026-10-28T16:50:00Z"
  }
}
```

---

### 3. Search Memory (`POST /search_memory`)

**Request Payload:**

```json
{
  "query": "What language or framework does the user like?",
  "user_id": "alice",
  "top_k": 3,
  "score_threshold": 0.4
}
```

**Response:**

```json
{
  "status": "success",
  "count": 2,
  "results": [
    {
      "id": "mem_101",
      "text": "I prefer Python for backend engineering.",
      "score": 0.88,
      "memory_type": "preference",
      "importance": 0.9,
      "created_at": "2026-10-28T16:45:00Z"
    },
    {
      "id": "mem_102",
      "text": "User prefers FastAPI over Flask.",
      "score": 0.82,
      "memory_type": "preference",
      "importance": 0.8,
      "created_at": "2026-10-28T16:50:00Z"
    }
  ]
}
```

---

### 4. Update Memory (`PUT /update_memory`)

**Request Payload:**

```json
{
  "memory_id": "mem_102",
  "user_id": "alice",
  "text": "User prefers FastAPI over Flask for production services.",
  "importance": 0.9
}
```

**Response:**

```json
{
  "status": "success",
  "memory_id": "mem_102",
  "updated_fields": {
    "text": "User prefers FastAPI over Flask for production services.",
    "importance": 0.9,
    "updated_at": "2026-10-28T17:00:00Z"
  }
}
```

---

### 5. Supersede Memory (`PUT /supersede_memory`)

**Request Payload:**

```json
{
  "old_memory_id": "mem_101",
  "user_id": "alice",
  "new_memory_text": "I now prefer TypeScript and Go for backend engineering.",
  "reason": "User updated tech stack preferences."
}
```

**Response:**

```json
{
  "status": "success",
  "archived_memory_id": "mem_101",
  "new_memory_id": "mem_103",
  "message": "Memory mem_101 superseded by mem_103."
}
```

---

### 6. Detect Memory Conflict (`POST /detect_memory_conflict`)

**Request Payload:**

```json
{
  "existing_memory": "User prefers working in remote environments.",
  "new_memory": "User prefers working strictly on-site in an office."
}
```

**Response:**

```json
{
  "has_conflict": true,
  "conflict_score": 0.94,
  "reasoning": "The new statement directly contradicts the preference for remote work."
}
```

---

### 7. Classify Relationship (`POST /classify_memory_relationship`)

**Request Payload:**

```json
{
  "existing_memory": "I prefer Python",
  "new_memory": "I now prefer TypeScript"
}
```

**Response:**

```json
{
  "relationship": "update",
  "confidence": 0.91,
  "recommendation": "Supersede existing_memory with new_memory."
}
```

---

### 8. Add Knowledge Document (`POST /add_memory_file_upload`)

**Request Payload (`multipart/form-data`):**

- `file`: `document.pdf` (binary file)
- `user_id`: `"alice"`
- `chunk_size`: `500`
- `chunk_overlap`: `50`

**Response:**

```json
{
  "status": "success",
  "filename": "document.pdf",
  "chunks_indexed": 12,
  "document_id": "doc_908123"
}
```

---

### 9. Search Knowledge (`POST /search_knowledge`)

**Request Payload:**

```json
{
  "query": "What are the API limits?",
  "user_id": "alice",
  "top_k": 2
}
```

**Response:**

```json
{
  "status": "success",
  "results": [
    {
      "chunk_id": "chunk_04",
      "document_id": "doc_908123",
      "text": "The API rate limit is set to 100 requests per minute per user account.",
      "score": 0.91
    },
    {
      "chunk_id": "chunk_05",
      "document_id": "doc_908123",
      "text": "Exceeding rate limits will result in HTTP 429 Too Many Requests responses.",
      "score": 0.84
    }
  ]
}
```

---

### 10. Contextualize Query (`POST /contextualize_query`)

**Request Payload:**

```json
{
  "query": "Which one was faster?",
  "history": [
    { "role": "user", "content": "We tested FastAPI vs Flask yesterday." },
    {
      "role": "assistant",
      "content": "FastAPI usually performs significantly better in asynchronous workloads."
    }
  ]
}
```

**Response:**

```json
{
  "original_query": "Which one was faster?",
  "contextualized_query": "Which framework was faster between FastAPI and Flask in yesterday's test?"
}
```

---

## 📄 License

MIT License
