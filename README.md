# ai-memory-rag-dashboard

> A sleek, dark-mode React dashboard and context inspector component for local multi-tenant RAG and memory systems.

## ✨ Features

- **Real-time SSE Chat:** Reads `/chat/stream` chunks with auto-scrolling and a typing indicator cursor.
- **Live Inspector Pane:** Shows rewritten contextual queries, retrieved user memories, and background task statuses side-by-side.
- **Memory Management:** Dedicated tabs for manual memory creation, Qdrant vector lookups, and conflict/relationship testing.
- **Knowledge Base Ingestion:** Drag-and-drop document uploader supporting custom chunk sizes and overlap controls.
- **Configurable Environment:** Edit API Base URL, User ID, and Session ID directly in the header controls at runtime.

---

## ⚡ Prerequisites

To use this React component in your project, ensure you have:

- **Node.js**: `v18.0.0` or higher.
- **React**: `^18.0.0` or `^19.0.0`.
- **Tailwind CSS**: `^3.0.0` configured in your build system (Next.js, Vite, CRA, etc.).
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

### Step 2: Ensure Tailwind CSS Configuration

Make sure Tailwind CSS scans your `node_modules` directory for styling. Update `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/ai-memory-rag-dashboard/dist/**/*.{js,mjs}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

---

## 💻 Usage

Embed the `AIMemoryDashboard` component in your React / Next.js application:

```tsx
import React from 'react';
import { AIMemoryDashboard } from 'ai-memory-rag-dashboard';

export default function DashboardPage() {
  return (
    <div className="h-screen w-full bg-slate-950">
      <AIMemoryDashboard />
    </div>
  );
}
```

---

## ⚙️ Default Endpoint Map & Contracts

The component connects directly to your FastAPI backend using the following request/response schemas:

### 1. SSE Chat (`POST /chat/stream`)

**Payload:**

```json
{
  "query": "How do I setup state management?",
  "history": [],
  "top_k": 2,
  "score_threshold": 0.55,
  "user_id": "alice",
  "session_id": "session_001"
}
```

**Stream:** Returns raw text chunks as Server-Sent Events (`data: chunk`).

---

### 2. Manual Memory Store (`POST /store`)

**Payload:**

```json
{
  "text": "User prefers Tailwind CSS for frontend projects.",
  "user_id": "alice",
  "session_id": "session_001",
  "memory_type": "fact",
  "importance": 0.8
}
```

**Response:**

```json
{
  "status": "success",
  "memory_id": "c7a21390-1e89-4d2b-9eef-4122bc1d8a3f"
}
```

---

### 3. Memory Search (`POST /search_memory`)

**Payload:**

```json
{
  "query": "styling tools",
  "limit": 5,
  "score_threshold": 0.3,
  "use_importance_weight": true,
  "user_id": "alice"
}
```

**Response:**

```json
{
  "results": [
    {
      "id": "c7a21390-1e89-4d2b-9eef-4122bc1d8a3f",
      "text": "User prefers Tailwind CSS for frontend projects.",
      "score": 0.88
    }
  ]
}
```

---

## 📄 License

MIT License
