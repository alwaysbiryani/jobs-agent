"use client";

import { cloneElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  Loader2,
  Sparkles,
  CheckCheck,
  MapPin,
  Briefcase,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ListFilter,
  Bookmark,
  Plus,
  Trash2,
  Key,
  X,
} from "lucide-react";
import JobCard from "@/components/JobCard";
import { useUserId } from "@/hooks/useUserId";
import { AGENT_CONFIG } from "@/lib/config";
import { Job, JobView } from "@/lib/types";
import { cn } from "@/lib/utils";

const LS_BOARDS = "jobscout_custom_boards";
const LS_KEYS = "jobscout_api_keys";

type ApiKeys = { serper: string; gemini: string };
type ApiErrorPayload = { code?: string; error?: string; success?: boolean };
type SyncResponse = { success: boolean; count?: number; error?: string; code?: string; enrichmentEnabled?: boolean };
type HealthStatus = {
  overall?: "ok" | "degraded";
  database: string;
  env: { SERPER_API_KEY: boolean; GEMINI_API_KEY: boolean; DATABASE_URL: boolean; CRON_SECRET: boolean };
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getApiErrorMessage(payload: unknown, status: number, fallback: string) {
  if (payload && typeof payload === "object") {
    const maybeError = payload as ApiErrorPayload;

    if (maybeError.code === "DEPENDENCY_DATABASE_UNAVAILABLE") {
      return "Database is unavailable. Set DATABASE_URL and verify connectivity.";
    }

    if (maybeError.code === "MISSING_SERPER_API_KEY") {
      return "Serper key is required for scans. Add it in API Keys.";
    }

    if (typeof maybeError.error === "string" && maybeError.error.trim().length > 0) {
      return maybeError.error;
    }
  }

  if (status === 503) {
    return "A required dependency is unavailable. Please try again after fixing configuration.";
  }

  return fallback;
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactElement<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-1.5 rounded-sm text-xs font-bold transition-all whitespace-nowrap",
        active ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {cloneElement(icon, { className: "w-3.5 h-3.5" })}
      {label}
    </button>
  );
}

function BoardsPanel({ open, onClose, customBoards, setCustomBoards }: { open: boolean; onClose: () => void; customBoards: string[]; setCustomBoards: (boards: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const addBoard = () => {
    const raw = draft.trim();
    if (!raw) return;
    const normalized = raw.startsWith("site:") ? raw : `site:${raw}`;
    if ([...AGENT_CONFIG.searchSites, ...customBoards].includes(normalized)) {
      setError("Already in your boards list.");
      return;
    }

    const next = [...customBoards, normalized];
    setCustomBoards(next);
    localStorage.setItem(LS_BOARDS, JSON.stringify(next));
    setError("");
    setDraft("");
  };

  const removeBoard = (board: string) => {
    const next = customBoards.filter((b) => b !== board);
    setCustomBoards(next);
    localStorage.setItem(LS_BOARDS, JSON.stringify(next));
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-zinc-950 border-l border-white/10 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h2 className="text-sm font-black text-white uppercase tracking-tight">Job Boards</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"><X className="w-4 h-4 text-zinc-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Add a Board URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. jobs.example.com"
                className="flex-1 bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm outline-none"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && addBoard()}
              />
              <button onClick={addBoard} className="px-3 py-2 bg-white text-black rounded-sm font-black text-xs">Add</button>
            </div>
            {error && <p className="text-[10px] font-mono text-red-400 mt-1.5">{error}</p>}
          </div>

          {customBoards.length > 0 && (
            <div className="space-y-1.5">
              {customBoards.map((board) => (
                <div key={board} className="flex items-center justify-between px-3 py-2 bg-white/5 border border-white/10 rounded-sm">
                  <span className="text-xs font-mono text-zinc-300">{board}</span>
                  <button onClick={() => removeBoard(board)} className="w-6 h-6 rounded-none flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 text-zinc-600">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function KeysModal({ open, onClose, apiKeys, setApiKeys }: { open: boolean; onClose: () => void; apiKeys: ApiKeys; setApiKeys: (keys: ApiKeys) => void }) {
  if (!open) return null;

  const save = () => {
    localStorage.setItem(LS_KEYS, JSON.stringify(apiKeys));
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-sm font-black text-white uppercase tracking-tight">API Keys</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-zinc-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <input type="password" placeholder="Serper API key (required)" className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm" value={apiKeys.serper} onChange={(e) => setApiKeys({ ...apiKeys, serper: e.target.value })} />
          <input type="password" placeholder="Gemini API key (optional)" className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm" value={apiKeys.gemini} onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })} />
          <p className="text-[10px] font-mono text-zinc-600">Serper is required for scans. Gemini is optional and only used for enrichment metadata.</p>
        </div>
        <div className="px-6 pb-5">
          <button onClick={save} className="w-full py-3 bg-white text-black rounded-sm font-black text-xs uppercase tracking-widest">Save Keys</button>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  const userId = useUserId();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<JobView>("new");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [searchRole, setSearchRole] = useState("Software Engineer");
  const [searchLocation, setSearchLocation] = useState("Remote");
  const [activeSearch, setActiveSearch] = useState<{ role: string; location: string } | null>(null);
  const [filter, setFilter] = useState({ industry: "all", stage: "all" });
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [customBoards, setCustomBoards] = useState<string[]>(() => readJson<string[]>(LS_BOARDS, []));
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => readJson<ApiKeys>(LS_KEYS, { serper: "", gemini: "" }));
  const [boardsOpen, setBoardsOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);

  const fetchJobs = useCallback(async (nextRole?: string, nextLocation?: string, tab: JobView = activeTab) => {
    if (!userId) return;

    setLoading(true);
    setJobsError(null);

    try {
      const params = new URLSearchParams({ userId, view: tab });
      if (nextRole) params.set("role", nextRole);
      if (nextLocation) params.set("location", nextLocation);

      const [jobsRes, healthRes] = await Promise.all([fetch(`/api/jobs?${params.toString()}`), fetch("/api/health")]);

      const jobsData = await readJsonResponse<unknown>(jobsRes);
      const healthData = await readJsonResponse<HealthStatus>(healthRes);
      if (healthData) setHealthStatus(healthData);

      if (!jobsRes.ok || !Array.isArray(jobsData)) {
        const errorMessage = getApiErrorMessage(jobsData, jobsRes.status, "Unable to load jobs.");
        setJobsError(errorMessage);
        setJobs([]);
        return;
      }

      setJobs(jobsData);
    } catch (error) {
      console.error(error);
      setJobsError("Network error while loading jobs.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, userId]);

  // Initial load for returning users.
  useEffect(() => {
    if (!userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchJobs();
  }, [userId, fetchJobs]);

  const handleSync = useCallback(async () => {
    const trimmedRole = searchRole.trim();
    const trimmedLocation = searchLocation.trim();
    if (!trimmedRole || !trimmedLocation) {
      setSyncError("Please enter both role and location before scanning.");
      return;
    }

    setSyncing(true);
    setSyncError(null);
    setSyncMessage(null);
    setSyncInfo(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKeys.serper) headers["x-serper-key"] = apiKeys.serper;
      if (apiKeys.gemini) headers["x-gemini-key"] = apiKeys.gemini;

      const res = await fetch("/api/cron/sync", {
        method: "POST",
        headers,
        body: JSON.stringify({ role: trimmedRole, location: trimmedLocation, customSites: customBoards }),
      });

      const data = await readJsonResponse<SyncResponse>(res);
      if (!res.ok || !data || data.success === false) {
        setSyncError(getApiErrorMessage(data, res.status, "Sync failed."));
        setActiveSearch({ role: trimmedRole, location: trimmedLocation });
        await fetchJobs(trimmedRole, trimmedLocation, activeTab);
        return;
      }

      setSyncMessage(`Synced ${data.count ?? 0} relevant jobs for ${trimmedRole} in ${trimmedLocation}.`);

      if (data.enrichmentEnabled === false) {
        setSyncInfo("Enrichment disabled: add a Gemini key to include industry, stage, and summary metadata.");
      }

      setActiveSearch({ role: trimmedRole, location: trimmedLocation });
      await fetchJobs(trimmedRole, trimmedLocation, activeTab);
    } catch (error) {
      console.error(error);
      setSyncError("Network error during sync.");
    } finally {
      setSyncing(false);
    }
  }, [activeTab, apiKeys, customBoards, fetchJobs, searchLocation, searchRole]);

  const handleTabChange = async (tab: JobView) => {
    setActiveTab(tab);
    await fetchJobs(activeSearch?.role, activeSearch?.location, tab);
  };

  const handleDismiss = async (jobId: string) => {
    await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, jobId, action: "dismiss" }) });
    setJobs((prev) => prev.filter((job) => job.id !== jobId));
  };

  const handleSave = async (jobId: string, currentlySaved: boolean) => {
    const action = currentlySaved ? "unsave" : "save";
    await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, jobId, action }) });
    await fetchJobs(activeSearch?.role, activeSearch?.location, activeTab);
  };

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    if (filter.industry !== "all" && job.industry !== filter.industry) return false;
    if (filter.stage !== "all" && job.company_stage !== filter.stage) return false;
    return true;
  }), [filter, jobs]);

  const industries = useMemo(() => Array.from(new Set(jobs.map((job) => job.industry).filter(Boolean) as string[])).sort(), [jobs]);
  const stages = useMemo(() => Array.from(new Set(jobs.map((job) => job.company_stage).filter(Boolean) as string[])).sort(), [jobs]);

  return (
    <main className="min-h-screen pb-20 bg-black">
      <nav className="sticky top-0 z-50 blocky border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-sm bg-white flex items-center justify-center"><Sparkles className="text-black w-5 h-5" /></div>
              <span className="font-display font-black text-xl tracking-tight uppercase text-white">JobScout</span>
            </div>
            <div className="flex items-center p-1 bg-white/5 rounded-sm border border-white/10">
              <TabButton active={activeTab === "new"} onClick={() => void handleTabChange("new")} icon={<ListFilter />} label="New" />
              <TabButton active={activeTab === "saved"} onClick={() => void handleTabChange("saved")} icon={<Bookmark />} label="Saved" />
              <TabButton active={activeTab === "all"} onClick={() => void handleTabChange("all")} icon={<Search />} label="All" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setKeysOpen(true)} className="w-9 h-9 rounded-sm border border-white/10 flex items-center justify-center bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10"><Key className="w-4 h-4" /></button>
            <div className="w-9 h-9 rounded-none border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-white">{userId?.slice(0, 2).toUpperCase()}</div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-12">
        <section className="mb-10 space-y-4">
          <p className="text-zinc-500 font-medium max-w-lg text-sm">Run targeted scans for role + location and review only relevant jobs.</p>
          <div className="blocky p-2 rounded-sm flex flex-col md:flex-row items-stretch gap-2 max-w-4xl">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/5 rounded-none border border-white/5">
              <Briefcase className="w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Role..." className="bg-transparent border-none p-0 text-sm text-white outline-none w-full font-bold" value={searchRole} onChange={(e) => setSearchRole(e.target.value)} />
            </div>
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/5 rounded-none border border-white/5">
              <MapPin className="w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Location..." className="bg-transparent border-none p-0 text-sm text-white outline-none w-full font-bold" value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)} />
            </div>
            <button onClick={handleSync} disabled={syncing} className="bg-white text-black px-8 py-3 rounded-none font-black flex items-center justify-center gap-2 disabled:opacity-50">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              <span className="text-xs uppercase tracking-widest">{syncing ? "Scanning..." : "Execute Scan"}</span>
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <button onClick={() => setBoardsOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
              <Search className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">{AGENT_CONFIG.searchSites.length + customBoards.length} Boards</span>
              <Plus className="w-3 h-3 text-zinc-600" />
            </button>
            {healthStatus?.database === "connected" ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest">DB Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-full border border-red-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest">DB Offline</span>
              </div>
            )}
          </div>

          {jobsError && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl"><p className="text-xs font-bold text-red-500 uppercase tracking-widest">{jobsError}</p></div>}
          {syncError && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl"><p className="text-xs font-bold text-red-500 uppercase tracking-widest">{syncError}</p></div>}
          {syncInfo && <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl"><p className="text-xs font-bold text-amber-300 uppercase tracking-widest">{syncInfo}</p></div>}
          {syncMessage && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"><p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{syncMessage}</p></div>}
        </section>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <FilterSelect icon={<Search className="w-3.5 h-3.5" />} label="Industry" value={filter.industry} options={industries} onChange={(v) => setFilter((f) => ({ ...f, industry: v }))} />
          <FilterSelect icon={<SlidersHorizontal className="w-3.5 h-3.5" />} label="Stage" value={filter.stage} options={stages} onChange={(v) => setFilter((f) => ({ ...f, stage: v }))} />
        </div>

        {loading ? (
          <div className="h-[300px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => <JobCard key={job.id} job={job} onSeen={handleDismiss} onSave={handleSave} />)}
          </div>
        ) : (
          <div className="blocky border-dashed rounded-none py-24 flex flex-col items-center justify-center text-center px-6">
            <CheckCheck className="w-8 h-8 text-zinc-800 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2 font-display uppercase tracking-tight">No results yet</h2>
            <p className="text-zinc-600 max-w-sm text-sm font-medium">Try broader role/location terms or add additional boards, then run another scan.</p>
          </div>
        )}
      </div>

      <BoardsPanel open={boardsOpen} onClose={() => setBoardsOpen(false)} customBoards={customBoards} setCustomBoards={setCustomBoards} />
      <KeysModal open={keysOpen} onClose={() => setKeysOpen(false)} apiKeys={apiKeys} setApiKeys={setApiKeys} />
    </main>
  );
}

function FilterSelect({ icon, label, value, options, onChange }: { icon: React.ReactNode; label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative group/select">
      <div className="flex items-center gap-2 blocky px-3 py-1.5 rounded-sm border-white/10 hover:border-white/30 transition-all cursor-pointer">
        <span className="text-zinc-600 group-hover/select:text-white transition-colors">{icon}</span>
        <span className="text-[11px] font-bold font-mono uppercase tracking-tight text-white/90">{value === "all" ? label : value}</span>
        <ChevronDown className="w-3 h-3 text-zinc-700" />
      </div>
      <select className="absolute inset-0 opacity-0 cursor-pointer w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">Any {label}</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
