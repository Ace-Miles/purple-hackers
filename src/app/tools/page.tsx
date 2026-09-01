"use client";
import { useState, useEffect, useCallback } from "react";
import { Wrench, Loader2, Copy, Check, AlertTriangle, CheckCircle2, Search, ChevronDown, ChevronUp, ExternalLink, Shield, Terminal, Sparkles, Zap, KeyRound } from "lucide-react";
import { useSession } from "next-auth/react";

type Tool = { id: string; category: string; name: string; desc: string; icon: string };
type Category = { id: string; name: string; desc: string; icon: string; color: string };

export default function ToolsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl purple-gradient flex items-center justify-center shrink-0">
          <Wrench size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Cyber Tools</h1>
          <p className="text-xs text-slate-400">Powered by Acemiles OS</p>
        </div>
      </div>

      <AcemilesOSConnector />
    </div>
  );
}

function AcemilesOSConnector() {
  const { data: session, status } = useSession();
  const [connected, setConnected] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [storedKey, setStoredKey] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loadingTools, setLoadingTools] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<{ toolId: string; data: any } | null>(null);
  const [toolInput, setToolInput] = useState<Record<string, string>>({});

  const fetchStatus = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/acemiles-os");
      const d = await res.json();
      setConnected(d.connected || false);
      setStoredKey(d.apiKey || null);
      if (d.connected && d.tools && d.tools.length > 0) {
        setTools(d.tools);
        setCategories(d.categories || []);
        setError("");
      } else if (d.connected && (!d.tools || d.tools.length === 0)) {
        setError(d.error || "No tools loaded. Your key may be invalid.");
      }
    } catch {
      setError("Failed to check connection status");
    }
  }, [status]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const connect = async () => {
    const key = inputKey.trim();
    if (!key) { setError("Please paste your Acemiles OS API key"); return; }
    if (!key.startsWith("ace_")) { setError("Invalid key format. Keys start with 'ace_' — generate one from Acemiles OS → API Access."); return; }

    setBusy(true); setError("");
    try {
      const res = await fetch("/api/acemiles-os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const d = await res.json();
      if (res.ok) {
        setConnected(true);
        setStoredKey(key);
        setInputKey("");
        // Fetch tools
        setLoadingTools(true);
        await new Promise(r => setTimeout(r, 500));
        await fetchStatus();
        setLoadingTools(false);
      } else {
        setError(d.error || "Connection failed");
      }
    } catch {
      setError("Connection failed — check your network");
    }
    setBusy(false);
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch("/api/acemiles-os", { method: "DELETE" });
      setConnected(false);
      setStoredKey(null);
      setTools([]);
      setCategories([]);
      setActiveCategory(null);
      setError("");
    } catch {}
    setBusy(false);
  };

  const runTool = async (tool: Tool) => {
    const input = toolInput[tool.id]?.trim();
    if (!input) return;
    setExecuting(tool.id);
    setExecResult(null);
    try {
      const res = await fetch("/api/acemiles-os/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId: tool.id, target: input, category: tool.category }),
      });
      const d = await res.json();
      setExecResult({ toolId: tool.id, data: d });
    } catch {
      setExecResult({ toolId: tool.id, data: { error: "Execution failed" } });
    }
    setExecuting(null);
  };

  if (status === "loading") {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-purple-500" /></div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-slate-400 mb-3">Sign in to connect with Acemiles OS</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 rounded-2xl purple-gradient mx-auto flex items-center justify-center mb-4">
          <KeyRound size={28} className="text-white" />
        </div>
        <h2 className="font-bold text-white text-lg mb-2">Connect to Acemiles OS</h2>
        <p className="text-sm text-slate-400 mb-4 max-w-md mx-auto">
          Paste your Acemiles OS API key to unlock <b className="text-purple-300">90+ cybersecurity tools</b> — dark web tools, OSINT suite, AI modules, network scanners, and more.
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-4">
          <span className="badge bg-purple-500/10 text-purple-400 text-xs px-3 py-1">🔴 Dark Tools</span>
          <span className="badge bg-cyan-500/10 text-cyan-400 text-xs px-3 py-1">🔵 Regular Tools</span>
          <span className="badge bg-amber-500/10 text-amber-400 text-xs px-3 py-1">🟡 AI Modules</span>
        </div>

        <div className="max-w-sm mx-auto space-y-3 text-left">
          <label className="text-xs text-slate-400 block">Acemiles OS API Key</label>
          <input
            type="password"
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !busy) connect(); }}
            className="input-dark w-full text-sm font-mono"
            placeholder="ace_xxxxxxxxxxxxxxxx"
            disabled={busy}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button onClick={connect} disabled={busy || !inputKey.trim()}
            className="btn-purple w-full px-6 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {busy ? "Connecting..." : "Connect"}
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-2">Don't have an API key?</p>
          <a href="https://acemiles-os.vercel.app/api-access" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
            Generate one from Acemiles OS → API Access <ExternalLink size={12} />
          </a>
        </div>
      </div>
    );
  }

  // Connected state
  const filtered = activeCategory ? tools.filter(t => t.category === activeCategory) : tools;
  const searched = search ? filtered.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase())) : filtered;

  return (
    <div className="space-y-4">
      {/* Connection banner */}
      <div className="card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
          <CheckCircle2 size={20} className="text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white">Connected to Acemiles OS</span>
          {storedKey && (
            <div className="flex items-center gap-1.5 mt-1">
              <code className="text-xs text-slate-500 font-mono truncate max-w-[200px]">
                {showKey ? storedKey : "•".repeat(Math.min(storedKey.length, 36))}
              </code>
              <button onClick={() => setShowKey(!showKey)} className="text-xs text-purple-400 hover:text-purple-300 shrink-0">
                {showKey ? "hide" : "show"}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(storedKey); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="p-1 rounded hover:bg-purple-500/10 shrink-0">
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-slate-400" />}
              </button>
            </div>
          )}
        </div>
        <button onClick={disconnect} disabled={busy} className="text-xs text-red-400 hover:text-red-300 transition-colors shrink-0">
          {busy ? "..." : "Disconnect"}
        </button>
      </div>

      {loadingTools && (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-purple-500" /></div>
      )}

      {!loadingTools && tools.length === 0 && (
        <div className="card p-6 text-center">
          {error ? (
            <>
              <AlertTriangle size={20} className="text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{error}</p>
              <a href="https://acemiles-os.vercel.app/api-access" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-3">
                Generate a new key <ExternalLink size={12} />
              </a>
            </>
          ) : (
            <p className="text-sm text-slate-400">No tools available. Try reconnecting.</p>
          )}
        </div>
      )}

      {tools.length > 0 && (
        <>
          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                !activeCategory ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-slate-800/50 text-slate-400 hover:text-purple-300"
              }`}>
              All ({tools.length})
            </button>
            {categories.map(cat => {
              const count = tools.filter(t => t.category === cat.id).length;
              const active = activeCategory === cat.id;
              return (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    active ? "border" : "bg-slate-800/50 text-slate-400 hover:text-white"
                  }`}
                  style={active ? { background: `${cat.color}20`, color: cat.color, borderColor: `${cat.color}40` } : {}}>
                  {cat.id === "dark" && <Shield size={12} />}
                  {cat.id === "regular" && <Terminal size={12} />}
                  {cat.id === "ai" && <Sparkles size={12} />}
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              className="input-dark pl-10" placeholder="Search tools..." />
          </div>

          {/* Tool grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {searched.map(tool => {
              const cat = categories.find(c => c.id === tool.category);
              return (
                <ToolCard key={tool.id} tool={tool} color={cat?.color || "#a855f7"}
                  executing={executing === tool.id}
                  input={toolInput[tool.id] || ""}
                  onInputChange={(v) => setToolInput(prev => ({ ...prev, [tool.id]: v }))}
                  onRun={() => runTool(tool)}
                  result={execResult?.toolId === tool.id ? execResult.data : null} />
              );
            })}
          </div>
          {searched.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No tools found.</p>}
        </>
      )}
    </div>
  );
}

function ToolCard({ tool, color, executing, input, onInputChange, onRun, result }: {
  tool: Tool; color: string; executing: boolean;
  input: string; onInputChange: (v: string) => void; onRun: () => void; result: any;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-3 transition-all" style={{ borderColor: expanded ? `${color}40` : undefined }}>
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <Wrench size={14} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white truncate">{tool.name}</h3>
          <p className="text-xs text-slate-500 truncate">{tool.desc}</p>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-slate-800 shrink-0">
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input type="text" value={input} onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !executing) onRun(); }}
              className="input-dark flex-1 text-sm" placeholder="Enter target..." disabled={executing} />
            <button onClick={onRun} disabled={executing || !input.trim()}
              className="btn-purple px-3 py-1.5 text-xs font-semibold shrink-0 disabled:opacity-40">
              {executing ? <Loader2 size={14} className="animate-spin" /> : "Run"}
            </button>
          </div>
          {result && (
            <div className="rounded-lg bg-black/40 border border-slate-800 p-2 max-h-[200px] overflow-auto">
              {result.error ? (
                <p className="text-xs text-red-400">{result.error}</p>
              ) : result.success === false ? (
                <p className="text-xs text-amber-400">{result.error || result.message || "Tool returned no results"}</p>
              ) : (
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(result.results || result.data || result, null, 2).slice(0, 1000)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
