import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  Server,
  User,
  Hash,
  MessageSquare,
  Database,
  FileText,
  Wand2,
  Bot,
  Trash2,
  Send,
  Eye,
  PlusCircle,
  Save,
  GitCompare,
  Search,
  UploadCloud,
  FilePlus,
  FileUp,
  BookOpen,
  Play,
} from 'lucide-react';

// Types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface MemoryItem {
  id: string;
  text: string;
  score: number;
}

interface KnowledgeItem {
  id: string;
  text: string;
  score: number;
}

export const AIMemoryDashboard: React.FC = () => {
  // Global Config State
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:8000');
  const [userId, setUserId] = useState('alice');
  const [sessionId, setSessionId] = useState('session_001');
  const [apiStatus, setApiStatus] = useState<
    'checking' | 'connected' | 'offline'
  >('offline');

  // Navigation State
  const [activeTab, setActiveTab] = useState<
    'chat' | 'memory' | 'knowledge' | 'contextualize'
  >('chat');

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inspector State
  const [inspectorSearchQuery] = useState('-- None --');
  const [inspectorMemCandidate, setInspectorMemCandidate] = useState(
    'No active conversation turns recorded yet.',
  );

  // Memory Tab State
  const [storeText, setStoreText] = useState('');
  const [storeType, setStoreType] = useState('fact');
  const [storeImportance, setStoreImportance] = useState(0.5);
  const [classExisting, setClassExisting] = useState('');
  const [classNew, setClassNew] = useState('');
  const [classResult, setClassResult] = useState(
    'Results will display here...',
  );
  const [memSearchQuery, setMemSearchQuery] = useState('');
  const [memSearchThresh, setMemSearchThresh] = useState(0.3);
  const [memSearchWeight, setMemSearchWeight] = useState(true);
  const [memoryResults, setMemoryResults] = useState<MemoryItem[]>([]);

  // Knowledge Base Tab State
  const [uploadChunkSize, setUploadChunkSize] = useState(1000);
  const [uploadChunkOverlap, setUploadChunkOverlap] = useState(200);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>(
    'Click to select a file (.txt or .pdf)',
  );
  const [isUploading, setIsUploading] = useState(false);
  const [knowSearchQuery, setKnowSearchQuery] = useState('');
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeItem[]>([]);

  // Contextualize Tab State
  const [contextHistoryJson, setContextHistoryJson] = useState(
    JSON.stringify(
      [
        {
          role: 'user',
          content: 'Hi',
        },
        {
          role: 'assistant',
          content: 'Hi, How can I assist you',
        },
        {
          role: 'user',
          content:
            'No Assistance needed right now. just here to share my coding preference.',
        },
        {
          role: 'assistant',
          content: 'Great! Tell me what you prefer',
        },
        {
          role: 'user',
          content: 'I prefer Python for Backend',
        },
      ],
      null,
      2,
    ),
  );
  const [contextRawQuery, setContextRawQuery] = useState(
    'what is my preference',
  );
  const [contextualizedResult, setContextualizedResult] = useState(
    '-- Click run to test --',
  );

  // Format Helper
  const getApiUrl = (path: string) =>
    `${apiBaseUrl.replace(/\/+$/, '')}${path}`;

  // Auto Scroll Chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isStreaming]);

  // Ping Health Check on Load / URL Change
  useEffect(() => {
    checkApiHealth();
  }, [apiBaseUrl]);

  const checkApiHealth = async () => {
    setApiStatus('checking');
    try {
      const res = await fetch(getApiUrl('/contextualize_query'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'ping', history: [] }),
      });
      if (res.ok) setApiStatus('connected');
      else setApiStatus('offline');
    } catch {
      setApiStatus('offline');
    }
  };

  // ----------------------------------------------------
  // 1. CHAT & STREAMING HANDLERS
  // ----------------------------------------------------
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query || isStreaming) return;

    const updatedHistory: ChatMessage[] = [
      ...chatHistory,
      { role: 'user', content: query },
    ];
    setChatHistory(updatedHistory);
    setChatInput('');
    setIsStreaming(true);

    setChatHistory((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const payload = {
        query,
        history: chatHistory,
        top_k: 2,
        score_threshold: 0.55,
        user_id: userId,
        session_id: sessionId,
      };

      const res = await fetch(getApiUrl('/chat/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Network response failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          setChatHistory((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: 'assistant', content: fullText };
            return next;
          });
        }
      }

      setInspectorMemCandidate(
        `Turn executed for ${userId}. Auto-extraction ran asynchronously.`,
      );
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        {
          role: 'system',
          content: `Error: ${err.message || 'Failed to fetch response'}`,
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  // ----------------------------------------------------
  // 2. MEMORY HANDLERS
  // ----------------------------------------------------
  const handleManualStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeText.trim()) return;

    try {
      const res = await fetch(getApiUrl('/store'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: storeText.trim(),
          user_id: userId,
          session_id: sessionId,
          memory_type: storeType,
          importance: storeImportance,
        }),
      });
      const data = await res.json();
      alert(`Memory Stored Successfully!\nID: ${data.memory_id || 'OK'}`);
      setStoreText('');
    } catch (err: any) {
      alert(`Store failed: ${err.message}`);
    }
  };

  const handleSearchMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(getApiUrl('/search_memory'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: memSearchQuery.trim(),
          limit: 5,
          score_threshold: memSearchThresh,
          use_importance_weight: memSearchWeight,
          user_id: userId,
        }),
      });
      const data = await res.json();
      setMemoryResults(data.results || []);
    } catch (err: any) {
      alert(`Search error: ${err.message}`);
    }
  };

  const testConflict = async () => {
    setClassResult('Analyzing conflict...');
    try {
      const res = await fetch(getApiUrl('/detect_memory_conflict'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existing_memory: classExisting,
          new_memory: classNew,
        }),
      });
      const data = await res.json();
      setClassResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setClassResult(`Error: ${err.message}`);
    }
  };

  const testRelationship = async () => {
    setClassResult('Classifying relationship...');
    try {
      const res = await fetch(getApiUrl('/classify_memory_relationship'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existing_memory: classExisting,
          new_memory: classNew,
        }),
      });
      const data = await res.json();
      setClassResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setClassResult(`Error: ${err.message}`);
    }
  };

  // ----------------------------------------------------
  // 3. KNOWLEDGE HANDLERS
  // ----------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setSelectedFileName(e.target.files[0].name);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a .txt or .pdf file first.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const url = `${getApiUrl('/add_memory_file_upload')}?chunk_size=${uploadChunkSize}&chunk_overlap=${uploadChunkOverlap}&user_id=${userId}`;
      const res = await fetch(url, { method: 'POST', body: formData });
      const data = await res.json();

      alert(
        `Document Processing Complete!\nChunks Stored: ${data.chunks_stored}`,
      );

      // --- Reset file selection state & DOM input ---
      setSelectedFile(null);
      setSelectedFileName('Click to select a file (.txt or .pdf)');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearchKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(getApiUrl('/search_knowledge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: knowSearchQuery.trim(),
          limit: 5,
          user_id: userId,
        }),
      });
      const data = await res.json();
      setKnowledgeResults(data.results || []);
    } catch (err: any) {
      alert(`Knowledge Search Error: ${err.message}`);
    }
  };

  // ----------------------------------------------------
  // 4. CONTEXTUALIZE HANDLERS
  // ----------------------------------------------------
  const handleContextualizeTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setContextualizedResult('Processing LLM rewrite...');
    try {
      const historyObj = JSON.parse(contextHistoryJson);
      const res = await fetch(getApiUrl('/contextualize_query'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: contextRawQuery, history: historyObj }),
      });
      const data = await res.json();
      setContextualizedResult(data.contextualized_query || data.original_query);
    } catch (err: any) {
      setContextualizedResult(`Error: ${err.message}`);
    }
  };

  return (
    <div className="h-screen flex flex-col font-sans bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 shrink-0 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                AI Memory + RAG Dashboard
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Phase 10 Hardened
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Interactive System Testbench & Context Inspector
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">API:</span>
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                className="bg-transparent border-none text-slate-200 focus:outline-none w-44 font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">User:</span>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="bg-transparent border-none text-slate-200 focus:outline-none w-20 font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Session:</span>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="bg-transparent border-none text-slate-200 focus:outline-none w-24 font-mono text-xs"
              />
            </div>

            <button
              onClick={checkApiHealth}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  apiStatus === 'connected'
                    ? 'bg-emerald-500'
                    : apiStatus === 'checking'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-rose-500'
                }`}
              ></span>
              <span>
                {apiStatus === 'connected'
                  ? 'Connected'
                  : apiStatus === 'checking'
                    ? 'Checking...'
                    : 'Offline'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-900/60 border-b border-slate-800 px-4 shrink-0">
        <div className="max-w-7xl mx-auto flex space-x-2 overflow-x-auto text-sm">
          {[
            { id: 'chat', label: 'Chat & RAG Assistant', icon: MessageSquare },
            { id: 'memory', label: 'Memory Management', icon: Database },
            { id: 'knowledge', label: 'Knowledge Base', icon: FileText },
            { id: 'contextualize', label: 'Query Contextualizer', icon: Wand2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Panels */}
      <main className="flex-1 overflow-hidden relative max-w-7xl w-full mx-auto p-4">
        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-lg">
              <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" /> Active SSE Stream
                </span>
                <button
                  onClick={() => setChatHistory([])}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Stream
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-8">
                    Start chatting to test real-time SSE streaming and
                    background memory consolidation!
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.role === 'user'
                          ? 'justify-end'
                          : msg.role === 'assistant'
                            ? 'justify-start gap-2.5'
                            : 'justify-center'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] px-3.5 py-2 rounded-xl text-xs font-sans whitespace-pre-wrap break-words ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : msg.role === 'assistant'
                              ? 'bg-slate-800 border border-slate-700/60 text-slate-100 rounded-tl-none'
                              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono'
                        }`}
                      >
                        {msg.content.trim()}
                        {isStreaming &&
                          idx === chatHistory.length - 1 &&
                          msg.role === 'assistant' && (
                            <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse align-middle" />
                          )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              <form
                onSubmit={handleChatSubmit}
                className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isStreaming}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isStreaming}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Inspector */}
            <div className="w-full md:w-96 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-lg shrink-0">
              <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-400" /> Context Inspector
                </span>
              </div>
              <div className="p-3 space-y-3 text-xs overflow-y-auto">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Contextualized Query
                  </span>
                  <p className="font-mono text-indigo-300">
                    {inspectorSearchQuery}
                  </p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Background Memory Task
                  </span>
                  <p className="font-mono text-slate-400 text-[11px]">
                    {inspectorMemCandidate}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MEMORY TAB */}
        {activeTab === 'memory' && (
          <div className="h-full overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-indigo-400" /> Store
                  Memory
                </h2>
                <form onSubmit={handleManualStore} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Memory Statement
                    </label>
                    <textarea
                      value={storeText}
                      onChange={(e) => setStoreText(e.target.value)}
                      placeholder="e.g., I prefer using FastAPI over Flask."
                      required
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Type
                      </label>
                      <select
                        value={storeType}
                        onChange={(e) => setStoreType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="fact">fact</option>
                        <option value="preference">preference</option>
                        <option value="instruction">instruction</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Importance (<span>{storeImportance}</span>)
                      </label>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.1"
                        value={storeImportance}
                        onChange={(e) =>
                          setStoreImportance(parseFloat(e.target.value))
                        }
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" /> Store via /store
                  </button>
                </form>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-amber-400" /> Relationship
                  & Conflict Classifier
                </h2>
                <div className="space-y-2 text-xs">
                  <input
                    type="text"
                    value={classExisting}
                    onChange={(e) => setClassExisting(e.target.value)}
                    placeholder="Existing memory"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
                  />
                  <input
                    type="text"
                    value={classNew}
                    onChange={(e) => setClassNew(e.target.value)}
                    placeholder="New candidate memory"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={testConflict}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 rounded-lg border border-slate-700 text-xs"
                    >
                      Test Conflict
                    </button>
                    <button
                      onClick={testRelationship}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 rounded-lg border border-slate-700 text-xs"
                    >
                      Classify Relation
                    </button>
                  </div>
                  <pre className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap">
                    {classResult}
                  </pre>
                </div>
              </div>
            </div>

            {/* Query Memory Vector Store */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-400" /> Query Memory
                  Vector Store
                </h2>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 text-slate-400">
                    <span>Importance Weight:</span>
                    <input
                      type="checkbox"
                      checked={memSearchWeight}
                      onChange={(e) => setMemSearchWeight(e.target.checked)}
                      className="accent-cyan-600 rounded"
                    />
                  </label>
                  <div className="flex items-center gap-1 text-slate-400">
                    <span>Threshold:</span>
                    <input
                      type="number"
                      value={memSearchThresh}
                      onChange={(e) =>
                        setMemSearchThresh(Number(e.target.value))
                      }
                      step="0.05"
                      className="w-14 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <form onSubmit={handleSearchMemory} className="flex gap-2">
                <input
                  type="text"
                  value={memSearchQuery}
                  onChange={(e) => setMemSearchQuery(e.target.value)}
                  placeholder="Search memories (e.g., programming preferences)..."
                  required
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                />
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" /> Search
                </button>
              </form>

              {/* Memory Items List / Grid */}
              <div id="memoryResultsList" className="space-y-2 text-xs">
                {memoryResults.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    Run a search above to inspect active user memories in
                    Qdrant.
                  </div>
                ) : (
                  memoryResults.map((mem) => (
                    <div
                      key={mem.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1"
                    >
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>ID: {mem.id}</span>
                        <span>Score: {mem.score.toFixed(3)}</span>
                      </div>
                      <p className="text-slate-200">{mem.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* KNOWLEDGE BASE TAB */}
        {activeTab === 'knowledge' && (
          <div className="h-full overflow-y-auto space-y-4 pr-1">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-cyan-400" /> Upload
                Document to Knowledge Base
              </h2>

              <form onSubmit={handleFileUpload} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Chunk Size (chars)
                    </label>
                    <input
                      type="number"
                      value={uploadChunkSize}
                      onChange={(e) =>
                        setUploadChunkSize(Number(e.target.value))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Chunk Overlap (chars)
                    </label>
                    <input
                      type="number"
                      value={uploadChunkOverlap}
                      onChange={(e) =>
                        setUploadChunkOverlap(Number(e.target.value))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 text-center bg-slate-950/50 transition-colors">
                  <input
                    type="file"
                    id="knowledgeFile"
                    ref={fileInputRef}
                    accept=".txt,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="knowledgeFile"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-1"
                  >
                    <FilePlus className="w-8 h-8 text-slate-500" />
                    <span className="text-xs text-slate-300 font-medium">
                      {selectedFileName}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Will be chunked and indexed into 'knowledge' collection
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  {isUploading ? 'Processing...' : 'Process & Index Document'}
                </button>
              </form>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" /> Search Reranked
                Knowledge Base
              </h2>

              <form onSubmit={handleSearchKnowledge} className="flex gap-2">
                <input
                  type="text"
                  value={knowSearchQuery}
                  onChange={(e) => setKnowSearchQuery(e.target.value)}
                  placeholder="Search ingested files & documents..."
                  required
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                />
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" /> Search
                </button>
              </form>

              <div className="space-y-2 text-xs">
                {knowledgeResults.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    Search to view reranked document chunks from Qdrant.
                  </div>
                ) : (
                  knowledgeResults.map((res) => (
                    <div
                      key={res.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1"
                    >
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>ID: {res.id}</span>
                        <span>Score: {res.score.toFixed(3)}</span>
                      </div>
                      <p className="text-slate-200">{res.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONTEXTUALIZE QUERY TESTER TAB */}
        {activeTab === 'contextualize' && (
          <div className="h-full overflow-y-auto space-y-4 pr-1">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md max-w-3xl mx-auto space-y-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-cyan-400" /> Test Query
                  Reformulation Engine
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Test how the system transforms vague or follow-up queries
                  (e.g. "what is my preference?") into standalone queries using
                  chat history.
                </p>
              </div>

              <form onSubmit={handleContextualizeTest} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Simulated Recent Chat History (JSON Format)
                  </label>
                  <textarea
                    rows={5}
                    value={contextHistoryJson}
                    onChange={(e) => setContextHistoryJson(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Latest Ambiguous Follow-up Query
                  </label>
                  <input
                    type="text"
                    value={contextRawQuery}
                    onChange={(e) => setContextRawQuery(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <Play className="w-3.5 h-3.5" /> Run Contextualization
                </button>
              </form>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Reformulated Standalone Output
                </span>
                <div className="font-mono text-xs text-cyan-300 whitespace-pre-wrap">
                  {contextualizedResult}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AIMemoryDashboard;
