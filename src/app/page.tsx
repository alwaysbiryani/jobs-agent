"use client";

import { useState, useEffect, useCallback, useMemo, cloneElement } from "react";
import { RefreshCcw, Loader2, Sparkles, CheckCheck, MapPin, Briefcase, Search, SlidersHorizontal, ChevronDown, ListFilter, Bookmark, Send, Users, History, Plus, Trash2, Key, X, Settings } from "lucide-react";
import { Job, JobView } from "@/lib/types";
import { AGENT_CONFIG } from "@/lib/config";
import { useUserId } from "@/hooks/useUserId";
import JobCard from "@/components/JobCard";
import { cn } from "@/lib/utils";

// ─── localStorage keys ───────────────────────────────────────────────────────
const LS_BOARDS = "jobscout_custom_boards";
const LS_KEYS   = "jobscout_api_keys";

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabButton({
  active, onClick, icon, label
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
        active ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {cloneElement(icon as React.ReactElement<any>, { className: "w-3.5 h-3.5" })}
      {label}
    </button>
  );
}

// ─── Job Boards Panel ─────────────────────────────────────────────────────────
function BoardsPanel({
  open, onClose, customBoards, setCustomBoards
}: {
  open: boolean;
  onClose: () => void;
  customBoards: string[];
  setCustomBoards: (boards: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const builtIn = AGENT_CONFIG.searchSites;

  const addBoard = () => {
    const raw = draft.trim();
    if (!raw) return;
    // Accept bare domain like "jobs.example.com" or full site: prefix
    const asOperator = raw.startsWith("site:") ? raw : `site:${raw}`;
    if ([...builtIn, ...customBoards].includes(asOperator)) {
      setError("Already in your boards list.");
      return;
    }
    setError("");
    const next = [...customBoards, asOperator];
    setCustomBoards(next);
    localStorage.setItem(LS_BOARDS, JSON.stringify(next));
    setDraft("");
  };

  const removeBoard = (board: string) => {
    const next = customBoards.filter(b => b !== board);
    setCustomBoards(next);
    localStorage.setItem(LS_BOARDS, JSON.stringify(next));
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Slide-in panel */}
      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-zinc-950 border-l border-white/10 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tight">Job Boards</h2>
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-0.5">{builtIn.length + customBoards.length} Active Sources</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Add new */}
          <div>
            <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Add a Board URL</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus-within:border-white/30 transition-colors">
                <Search className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. jobs.example.com"
                  className="bg-transparent text-sm text-white placeholder:text-zinc-700 outline-none w-full font-medium"
                  value={draft}
                  onChange={e => { setDraft(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && addBoard()}
                />
              </div>
              <button
                onClick={addBoard}
                className="px-3 py-2 bg-white text-black rounded-lg font-black text-xs hover:bg-zinc-200 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            {error && <p className="text-[10px] font-mono text-red-400 mt-1.5">{error}</p>}
            <p className="text-[10px] font-mono text-zinc-600 mt-1.5">We'll prefix <span className="text-zinc-400">site:</span> automatically. Custom boards are searched alongside the defaults each scan.</p>
          </div>

          {/* Custom boards */}
          {customBoards.length > 0 && (
            <div>
              <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Your Custom Boards</label>
              <div className="space-y-1.5">
                {customBoards.map(board => (
                  <div key={board} className="flex items-center justify-between px-3 py-2 bg-white/5 border border-white/10 rounded-lg group">
                    <span className="text-xs font-mono text-zinc-300">{board}</span>
                    <button
                      onClick={() => removeBoard(board)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 text-zinc-600 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Built-in boards */}
          <div>
            <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Built-in Boards</label>
            <div className="space-y-1.5">
              {builtIn.map(board => (
                <div key={board} className="flex items-center px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg">
                  <span className="text-xs font-mono text-zinc-600">{board}</span>
                  <span className="ml-auto text-[9px] font-mono text-zinc-700 uppercase tracking-widest">default</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── API Keys Modal ───────────────────────────────────────────────────────────
function KeysModal({
  open, onClose, apiKeys, setApiKeys
}: {
  open: boolean;
  onClose: () => void;
  apiKeys: { serper: string; gemini: string };
  setApiKeys: (keys: { serper: string; gemini: string }) => void;
}) {
  const [draft, setDraft] = useState(apiKeys);
  const [saved, setSaved] = useState(false);

  // sync when modal re-opens
  useEffect(() => { if (open) { setDraft(apiKeys); setSaved(false); } }, [open, apiKeys]);

  const save = () => {
    setApiKeys(draft);
    localStorage.setItem(LS_KEYS, JSON.stringify(draft));
    setSaved(true);
    setTimeout(onClose, 800);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <Key className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tight">API Keys</h2>
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-0.5">Stored locally · Never sent to our servers</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Serper API Key</label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg focus-within:border-white/30 transition-colors">
              <Key className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <input
                type="password"
                placeholder="sk-••••••••••••••••"
                className="bg-transparent text-sm text-white placeholder:text-zinc-700 outline-none w-full font-mono"
                value={draft.serper}
                onChange={e => setDraft(d => ({ ...d, serper: e.target.value }))}
              />
              {draft.serper && (
                <button onClick={() => setDraft(d => ({ ...d, serper: "" }))} className="text-zinc-600 hover:text-zinc-400">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[10px] font-mono text-zinc-600 mt-1.5">
              Get yours at{" "}
              <a href="https://serper.dev" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white transition-colors underline underline-offset-2">
                serper.dev
              </a>
            </p>
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Gemini API Key</label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg focus-within:border-white/30 transition-colors">
              <Key className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <input
                type="password"
                placeholder="AIza••••••••••••••••"
                className="bg-transparent text-sm text-white placeholder:text-zinc-700 outline-none w-full font-mono"
                value={draft.gemini}
                onChange={e => setDraft(d => ({ ...d, gemini: e.target.value }))}
              />
              {draft.gemini && (
                <button onClick={() => setDraft(d => ({ ...d, gemini: "" }))} className="text-zinc-600 hover:text-zinc-400">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[10px] font-mono text-zinc-600 mt-1.5">
              Get yours at{" "}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white transition-colors underline underline-offset-2">
                aistudio.google.com
              </a>
            </p>
          </div>

          <div className="pt-1 p-3 bg-white/[0.03] border border-white/5 rounded-xl">
            <p className="text-[10px] font-mono text-zinc-600 leading-relaxed">
              🔒 Keys are saved to your browser's localStorage and sent only from your browser directly to the JobScout API. They override missing environment variables — useful when running locally or when hitting plan limits.
            </p>
          </div>
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={save}
            className="w-full py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 active:scale-95 transition-all"
          >
            {saved ? "✓ Saved" : "Save Keys"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const userId = useUserId();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<JobView>("new");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<{ database: string; env: any } | null>(null);

  const [searchRole, setSearchRole] = useState("Software Engineer");
  const [searchLocation, setSearchLocation] = useState("Remote");
  const [activeSearch, setActiveSearch] = useState<{ role: string; location: string } | null>({ role: "Software Engineer", location: "Remote" });

  const [filter, setFilter] = useState({ industry: "all", stage: "all", location: "all", company: "all" });
  const [keysMissing, setKeysMissing] = useState({ serper: false, gemini: false });

  // Panels
  const [boardsOpen, setBoardsOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);

  // localStorage-backed state
  const [customBoards, setCustomBoards] = useState<string[]>([]);
  const [apiKeys, setApiKeys] = useState({ serper: "", gemini: "" });

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const boards = localStorage.getItem(LS_BOARDS);
      if (boards) setCustomBoards(JSON.parse(boards));
      const keys = localStorage.getItem(LS_KEYS);
      if (keys) setApiKeys(JSON.parse(keys));
    } catch (_) {}
  }, []);

  // Derive whether user has supplied their own keys
  const hasUserKeys = !!(apiKeys.serper || apiKeys.gemini);

  const fetchJobs = useCallback(async (role?: string, location?: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId,
        view: activeTab,
        ...(role && { role }),
        ...(location && { location })
      });
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setJobs(data);

      const healthRes = await fetch("/api/health");
      const healthData = await healthRes.json();
      setHealthStatus(healthData);

      // Also reflect that user keys can cover missing env keys
      setKeysMissing({
        serper: !healthData.env.SERPER_API_KEY && !apiKeys.serper,
        gemini: !healthData.env.GEMINI_API_KEY && !apiKeys.gemini,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab, apiKeys]);

  useEffect(() => {
    if (activeSearch) {
      fetchJobs(activeSearch.role, activeSearch.location);
    } else {
      fetchJobs();
    }
  }, [fetchJobs, activeSearch]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    setActiveSearch({ role: searchRole, location: searchLocation });

    try {
      const params = new URLSearchParams({
        role: searchRole,
        location: searchLocation,
        ...(customBoards.length > 0 && { customSites: customBoards.join(",") }),
      });

      const headers: Record<string, string> = {};
      if (apiKeys.serper) headers["x-serper-key"] = apiKeys.serper;
      if (apiKeys.gemini) headers["x-gemini-key"] = apiKeys.gemini;

      const res = await fetch(`/api/cron/sync?${params.toString()}`, { headers });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        setSyncError(data.error || "Sync failed. Check your API keys and database connection.");
        setJobs([]);
      } else {
        await fetchJobs(searchRole, searchLocation);
      }
    } catch (err) {
      console.error(err);
      setSyncError("Network error during sync.");
    } finally {
      setSyncing(false);
    }
  }, [fetchJobs, searchRole, searchLocation, customBoards, apiKeys]);

  const handleDismiss = useCallback(async (jobId: string) => {
    try {
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, jobId, action: "dismiss" }),
      });
      if (activeTab === "new" || activeTab === "all") {
        setJobs(prev => prev.filter(j => j.id !== jobId));
      } else {
        fetchJobs();
      }
    } catch (err) {
      console.error(err);
      fetchJobs();
    }
  }, [userId, activeTab, fetchJobs]);

  const handleSave = useCallback(async (jobId: string, currentlySaved: boolean) => {
    const action = currentlySaved ? "unsave" : "save";
    try {
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, jobId, action }),
      });
      if (activeTab === "saved" && currentlySaved) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
      } else {
        fetchJobs();
      }
    } catch (err) {
      console.error(err);
    }
  }, [userId, activeTab, fetchJobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (filter.industry !== "all" && job.industry !== filter.industry) return false;
      if (filter.stage !== "all" && job.company_stage !== filter.stage) return false;
      if (filter.location !== "all" && !job.location.toLowerCase().includes(filter.location.toLowerCase())) return false;
      if (filter.company !== "all" && job.company !== filter.company) return false;
      return true;
    });
  }, [jobs, filter]);

  const industries = useMemo(() => Array.from(new Set(jobs.map(j => j.industry).filter((i): i is string => !!i))).sort(), [jobs]);
  const stages = useMemo(() => Array.from(new Set(jobs.map(j => j.company_stage).filter((s): s is string => !!s))).sort(), [jobs]);

  const totalBoardCount = AGENT_CONFIG.searchSites.length + customBoards.length;

  return (
    <main className="min-h-screen pb-20 bg-black">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-x-0 border-t-0 border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <Sparkles className="text-black w-5 h-5" />
              </div>
              <span className="font-display font-black text-xl tracking-tight uppercase text-white">JobScout</span>
            </div>

            <div className="h-6 w-px bg-white/10 ml-2" />

            <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
              <TabButton active={activeTab === "new"} onClick={() => setActiveTab("new")} icon={<ListFilter />} label="New" />
              <TabButton active={activeTab === "saved"} onClick={() => setActiveTab("saved")} icon={<Bookmark />} label="Saved" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Settings button */}
            <button
              id="open-settings-btn"
              onClick={() => setKeysOpen(true)}
              title="API Keys"
              className={cn(
                "w-9 h-9 rounded-lg border flex items-center justify-center transition-colors",
                hasUserKeys
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-white/5 border-white/10 text-zinc-500 hover:text-white hover:bg-white/10"
              )}
            >
              <Key className="w-4 h-4" />
            </button>

            <div className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-white">
              {userId?.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-12">
        {/* Discover / Search section */}
        {(activeTab === "new" || activeTab === "all") && (
          <section className="mb-16">
            <div className="flex flex-col gap-6">
              {/* Subtitle only — no big heading */}
              <p className="text-zinc-500 font-medium max-w-lg text-base">
                {activeSearch
                  ? `Showing strictly verified results for ${activeSearch.role} in ${activeSearch.location}.`
                  : `Welcome back. Exploring verified boards for top trending roles globally.`}
              </p>

              {/* Search bar */}
              <div className="glass p-2 rounded-2xl flex flex-col md:flex-row items-stretch gap-2 max-w-4xl border-white/20">
                <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/5 group focus-within:border-white/40 transition-colors">
                  <Briefcase className="w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                  <input
                    type="text"
                    placeholder="Role..."
                    className="bg-transparent border-none p-0 text-sm text-white placeholder:text-zinc-700 outline-none w-full font-bold"
                    value={searchRole}
                    onChange={e => setSearchRole(e.target.value)}
                  />
                </div>
                <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/5 group focus-within:border-white/40 transition-colors">
                  <MapPin className="w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                  <input
                    type="text"
                    placeholder="Location..."
                    className="bg-transparent border-none p-0 text-sm text-white placeholder:text-zinc-700 outline-none w-full font-bold"
                    value={searchLocation}
                    onChange={e => setSearchLocation(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="bg-white text-black px-8 py-3 rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-zinc-200 active:scale-95 transition-all"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  <span className="text-xs uppercase tracking-widest">{syncing ? "Scanning..." : "Execute Scan"}</span>
                </button>
              </div>

              {/* Status badges row */}
              <div className="flex items-center flex-wrap gap-3">
                {/* Boards badge — clickable */}
                <button
                  id="open-boards-btn"
                  onClick={() => setBoardsOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group"
                >
                  <Search className="w-3 h-3 text-zinc-500 group-hover:text-white transition-colors" />
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                    {totalBoardCount} Boards
                  </span>
                  {customBoards.length > 0 && (
                    <span className="text-[9px] font-mono text-zinc-600 uppercase">+{customBoards.length} custom</span>
                  )}
                  <Plus className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </button>

                {activeSearch && (
                  <button
                    onClick={() => { setActiveSearch(null); setSyncError(null); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/20 hover:bg-white/20 transition-all active:scale-95"
                  >
                    <ListFilter className="w-3 h-3 text-white" />
                    <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">Back to Discovery</span>
                  </button>
                )}

                {healthStatus?.database === "connected" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest">Core Sync: Online</span>
                  </div>
                )}

                {hasUserKeys && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/10">
                    <Key className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest">Your Keys Active</span>
                  </div>
                )}
              </div>

              {/* Sync error */}
              {syncError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{syncError}</p>
                    {(keysMissing.serper || keysMissing.gemini) && (
                      <button
                        onClick={() => setKeysOpen(true)}
                        className="mt-2 text-[10px] font-mono text-red-400 underline underline-offset-2 hover:text-red-300 transition-colors"
                      >
                        → Add your own API keys to continue
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Saved Header */}
        {activeTab === "saved" && (
          <section className="mb-12">
            <h1 className="text-5xl md:text-6xl font-display font-black tracking-tight text-white mb-2 leading-none uppercase">
              Bookmarked
            </h1>
            <p className="text-zinc-500 font-medium text-lg">Your curated collection of active job leads.</p>
          </section>
        )}

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-6 items-end lg:items-center justify-between mb-10 pb-6 border-b border-white/5">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              icon={<Search className="w-3.5 h-3.5" />}
              label="Industry"
              value={filter.industry}
              options={industries}
              onChange={v => setFilter(f => ({ ...f, industry: v }))}
            />
            <FilterSelect
              icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              label="Stage"
              value={filter.stage}
              options={stages}
              onChange={v => setFilter(f => ({ ...f, stage: v }))}
            />
          </div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-700 bg-white/5 px-4 py-2 rounded-full border border-white/5">
            {activeSearch ? "Query Match" : "Trending"}: {filteredJobs.length} Entries
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="h-[400px] flex flex-col items-center justify-center gap-5 glass rounded-3xl border-dashed">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white animate-spin" />
            <p className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest animate-pulse">Accessing Data...</p>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map(job => (
              <JobCard key={job.id} job={job} onSeen={handleDismiss} onSave={handleSave} />
            ))}
          </div>
        ) : (
          <div className="glass border-dashed rounded-3xl py-32 flex flex-col items-center justify-center text-center px-6 transition-all hover:bg-white/[0.02]">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/5">
              <CheckCheck className="w-8 h-8 text-zinc-800" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 font-display uppercase tracking-tight">Queue Empty</h2>
            <p className="text-zinc-600 max-w-sm text-sm font-medium">No active entries found for this view.</p>
          </div>
        )}

        {/* API key missing alert */}
        {(keysMissing.serper || keysMissing.gemini) && (
          <div className="mt-12 glass border-white/10 bg-white/5 p-5 rounded-2xl flex items-start gap-4">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
              <Key className="w-4 h-4 text-black" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-tight">Config Required</h4>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {keysMissing.serper && "SERPER_API_KEY"}{keysMissing.serper && keysMissing.gemini && " and "}{keysMissing.gemini && "GEMINI_API_KEY"} {(keysMissing.serper || keysMissing.gemini) ? "are" : "is"} missing from your environment.
              </p>
            </div>
            <button
              onClick={() => setKeysOpen(true)}
              className="shrink-0 px-4 py-2 bg-white text-black rounded-lg text-xs font-black uppercase tracking-wider hover:bg-zinc-200 active:scale-95 transition-all"
            >
              Add Keys
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <BoardsPanel
        open={boardsOpen}
        onClose={() => setBoardsOpen(false)}
        customBoards={customBoards}
        setCustomBoards={setCustomBoards}
      />
      <KeysModal
        open={keysOpen}
        onClose={() => setKeysOpen(false)}
        apiKeys={apiKeys}
        setApiKeys={setApiKeys}
      />
    </main>
  );
}

// ─── Filter Select ────────────────────────────────────────────────────────────
function FilterSelect({ icon, label, value, options, onChange }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative group/select">
      <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-lg border-white/10 hover:border-white/30 transition-all cursor-pointer">
        <span className="text-zinc-600 group-hover/select:text-white transition-colors">{icon}</span>
        <span className="text-[11px] font-bold font-mono uppercase tracking-tight text-white/90">{value === "all" ? label : value}</span>
        <ChevronDown className="w-3 h-3 text-zinc-700" />
      </div>
      <select
        className="absolute inset-0 opacity-0 cursor-pointer w-full"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="all">Any {label}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
