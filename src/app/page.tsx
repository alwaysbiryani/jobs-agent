"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCcw, Filter, Loader2, Sparkles, CheckCheck, MapPin, Briefcase, Save } from "lucide-react";
import { Job, JobStatus, JobView } from "@/lib/types";
import { useUserId } from "@/hooks/useUserId";
import JobCard from "@/components/JobCard";

const DEFAULT_PREFS_FORM = {
  roles: "Software Engineer, Product Manager",
  locations: "Remote, San Francisco",
  work_modes: "remote, hybrid",
  seniority: "senior, staff",
  must_have_keywords: "",
  excluded_keywords: "",
};

const WORKFLOW_VIEWS: Array<{ key: JobView; label: string }> = [
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "interviewing", label: "Interviewing" },
  { key: "dismissed", label: "Dismissed" },
];

function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToCsv(value: string[] | undefined) {
  return (value || []).join(", ");
}

export default function Home() {
  const userId = useUserId();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [view, setView] = useState<JobView>("new");
  const [preferencesForm, setPreferencesForm] = useState(DEFAULT_PREFS_FORM);
  const [filter, setFilter] = useState({
    role: "all",
    location: "all",
    company: "all",
    source: "all",
  });

  const [keysMissing, setKeysMissing] = useState({ serper: false, gemini: false });

  const fetchJobs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?userId=${userId}&status=${view}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);
      } else {
        setJobs([]);
      }
      
      // Check for missing keys in the response or a separate check
      const checkRes = await fetch('/api/cron/sync?check=true');
      const checkData = await checkRes.json();
      setKeysMissing({
        serper: checkData.error?.includes('SERPER'),
        gemini: checkData.error?.includes('GEMINI')
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId, view]);

  const fetchPreferences = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/preferences?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch preferences");
      const data = await res.json();
      const prefs = data.preferences;
      if (!prefs) return;

      setPreferencesForm({
        roles: listToCsv(prefs.roles),
        locations: listToCsv(prefs.locations),
        work_modes: listToCsv(prefs.work_modes),
        seniority: listToCsv(prefs.seniority),
        must_have_keywords: listToCsv(prefs.must_have_keywords),
        excluded_keywords: listToCsv(prefs.excluded_keywords),
      });
    } catch (err) {
      console.error(err);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPreferences();
  }, [fetchPreferences]);

  const handleSync = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const params = new URLSearchParams({ userId });
      if (filter.role !== "all") params.append("role", filter.role);
      if (filter.location !== "all") params.append("location", filter.location);

      await fetch(`/api/cron/sync?${params.toString()}`);
      await fetchJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  }, [fetchJobs, filter.location, filter.role, userId]);

  const handleSavePreferences = useCallback(async () => {
    if (!userId) return;
    setSavingPreferences(true);

    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          preferences: {
            roles: csvToList(preferencesForm.roles),
            locations: csvToList(preferencesForm.locations),
            work_modes: csvToList(preferencesForm.work_modes),
            seniority: csvToList(preferencesForm.seniority),
            must_have_keywords: csvToList(preferencesForm.must_have_keywords),
            excluded_keywords: csvToList(preferencesForm.excluded_keywords),
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      await fetchPreferences();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPreferences(false);
    }
  }, [fetchPreferences, preferencesForm, userId]);

  const handleJobAction = useCallback(async (jobId: string, action: JobStatus | "clear") => {
    if (!userId) return;
    setPendingAction(`${jobId}:${action}`);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, jobId, action }),
      });
      if (!res.ok) throw new Error("Failed to update job");
      await fetchJobs();
    } catch (err) {
      console.error(err);
      fetchJobs();
    } finally {
      setPendingAction(null);
    }
  }, [userId, fetchJobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const jobRole = job.search_role || "Unknown";
      const jobLocation = job.search_location || job.location;

      if (filter.role !== "all" && jobRole !== filter.role) return false;
      if (filter.location !== "all" && jobLocation !== filter.location) return false;
      if (filter.company !== "all" && job.company !== filter.company) return false;
      if (filter.source !== "all" && job.source !== filter.source) return false;
      return true;
    });
  }, [jobs, filter]);

  const roleOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...csvToList(preferencesForm.roles),
          ...jobs.map((job) => job.search_role).filter(Boolean) as string[],
        ])
      ).sort(),
    [jobs, preferencesForm.roles]
  );

  const locationOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...csvToList(preferencesForm.locations),
          ...jobs.map((job) => job.search_location || job.location).filter(Boolean) as string[],
        ])
      ).sort(),
    [jobs, preferencesForm.locations]
  );

  const companies = useMemo(() => Array.from(new Set(jobs.map((j) => j.company).filter(Boolean))).sort(), [jobs]);
  const sources = useMemo(() => Array.from(new Set(jobs.map((j) => j.source))).sort(), [jobs]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-outfit uppercase tracking-tighter text-white mb-2 flex items-center gap-3">
            <Sparkles className="text-blue-500 w-10 h-10" /> JobScout <span className="text-blue-500">Agent</span>
          </h1>
          <p className="text-zinc-500 font-medium">Role/location preferences + workflow pipeline for daily job tracking.</p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing || !userId}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shadow-lg shadow-blue-600/20"
        >
          {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
          Sync Agent
        </button>
      </div>

      <section className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
        <div className="flex items-center gap-2 text-zinc-300 mb-4">
          <Briefcase className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Preference Setup</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Roles (comma separated)"
              className="bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
              value={preferencesForm.roles}
              onChange={(e) => setPreferencesForm((prev) => ({ ...prev, roles: e.target.value }))}
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Locations (comma separated)"
              className="bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
              value={preferencesForm.locations}
              onChange={(e) => setPreferencesForm((prev) => ({ ...prev, locations: e.target.value }))}
            />
          </div>

          <input
            type="text"
            placeholder="Work modes (remote, hybrid, onsite)"
            className="bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            value={preferencesForm.work_modes}
            onChange={(e) => setPreferencesForm((prev) => ({ ...prev, work_modes: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Seniority (junior, senior, staff)"
            className="bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            value={preferencesForm.seniority}
            onChange={(e) => setPreferencesForm((prev) => ({ ...prev, seniority: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Must-have keywords"
            className="bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            value={preferencesForm.must_have_keywords}
            onChange={(e) => setPreferencesForm((prev) => ({ ...prev, must_have_keywords: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Excluded keywords"
            className="bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            value={preferencesForm.excluded_keywords}
            onChange={(e) => setPreferencesForm((prev) => ({ ...prev, excluded_keywords: e.target.value }))}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSavePreferences}
            disabled={savingPreferences || !userId}
            className="bg-white text-black px-5 py-2 rounded-lg font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {savingPreferences ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Preferences
          </button>
        </div>
      </section>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex flex-wrap gap-2">
        {WORKFLOW_VIEWS.map((option) => (
          <button
            key={option.key}
            onClick={() => setView(option.key)}
            className={`px-3 py-2 rounded-lg text-xs uppercase tracking-widest border transition-colors ${
              view === option.key
                ? "bg-blue-600/30 text-blue-200 border-blue-500/60"
                : "bg-zinc-900 text-zinc-400 border-white/10 hover:text-zinc-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-zinc-400 text-sm font-semibold mr-4 px-2 border-r border-white/10">
          <Filter className="w-4 h-4" /> VIEW FILTERS
        </div>
        
        <select 
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[140px]"
          value={filter.role}
          onChange={(e) => setFilter((f) => ({ ...f, role: e.target.value }))}
        >
          <option value="all">Role ({roleOptions.length})</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        <select 
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[140px]"
          value={filter.location}
          onChange={(e) => setFilter((f) => ({ ...f, location: e.target.value }))}
        >
          <option value="all">Location ({locationOptions.length})</option>
          {locationOptions.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>

        <select 
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[140px]"
          value={filter.company}
          onChange={(e) => setFilter((f) => ({ ...f, company: e.target.value }))}
        >
          <option value="all">Company ({companies.length})</option>
          {companies.map((company) => (
            <option key={company} value={company}>
              {company}
            </option>
          ))}
        </select>

        <select
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[140px]"
          value={filter.source}
          onChange={(e) => setFilter((f) => ({ ...f, source: e.target.value }))}
        >
          <option value="all">Source ({sources.length})</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>

        <div className="flex-1" />
        <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
          {filteredJobs.length} results
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-zinc-500 font-mono animate-pulse uppercase tracking-[0.2em] text-sm">Consulting Data Streams...</p>
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onAction={handleJobAction}
              pendingAction={pendingAction}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white/[0.02] border-2 border-dashed border-white/10 rounded-3xl py-32 flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <CheckCheck className="w-8 h-8 text-zinc-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">No Leads Found</h2>
          <p className="text-zinc-500 max-w-md">Try adjusting your search role or location above and click &quot;Sync Agent&quot; to start a fresh scan.</p>
        </div>
      )}

      {/* API Key Warnings */}
      {(keysMissing.serper || keysMissing.gemini) && (
        <div className="mt-8 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4 text-red-400">
          <div className="bg-red-500/20 p-2 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-sm">
            <p className="font-bold">Setup Required</p>
            <p className="text-red-400/80">
              Please add your {keysMissing.serper && "SERPER_API_KEY"} {keysMissing.serper && keysMissing.gemini && "and"} {keysMissing.gemini && "GEMINI_API_KEY"} to .env.local and restart the server.
            </p>
          </div>
        </div>
      )}

      {/* User Status Bar */}
      <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-600 text-[10px] font-mono tracking-widest uppercase">
        <span>Identity: {userId?.slice(0, 8)}...</span>
        <span>Auto-Sync Frequency: 24h</span>
        <span>Search Core: Serper + Gemini + Workflow Views</span>
      </div>
    </main>
  );
}
