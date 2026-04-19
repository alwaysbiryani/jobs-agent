"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCcw, Filter, Loader2, Sparkles, CheckCheck, MapPin, Briefcase } from "lucide-react";
import { Job } from "@/lib/types";
import { useUserId } from "@/hooks/useUserId";
import JobCard from "@/components/JobCard";

export default function Home() {
  const userId = useUserId();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Search Inputs (Hardcoded for search/scraping)
  const [searchRole, setSearchRole] = useState("Software Engineer");
  const [searchLocation, setSearchLocation] = useState("Remote");

  // View Filters (Applied to discovered jobs)
  const [filter, setFilter] = useState({
    industry: "all",
    stage: "all",
    location: "all",
    company: "all"
  });

  const [keysMissing, setKeysMissing] = useState({ serper: false, gemini: false });

  const fetchJobs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?userId=${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);
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
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises, react-hooks/set-state-in-effect
    fetchJobs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchJobs]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      // Pass the hard-coded typed inputs to the sync route
      await fetch(`/api/cron/sync?role=${encodeURIComponent(searchRole)}&location=${encodeURIComponent(searchLocation)}`);
      await fetchJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  }, [fetchJobs, searchRole, searchLocation]);

  const handleDismiss = useCallback(async (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    try {
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, jobId, action: "dismiss" }),
      });
    } catch (err) {
      console.error(err);
      fetchJobs();
    }
  }, [userId, fetchJobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (filter.industry !== "all" && job.industry !== filter.industry) return false;
      if (filter.stage !== "all" && job.company_stage !== filter.stage) return false;
      if (filter.location !== "all" && !job.location.toLowerCase().includes(filter.location.toLowerCase())) return false;
      if (filter.company !== "all" && job.company !== filter.company) return false;
      return true;
    });
  }, [jobs, filter]);

  const industries = useMemo(() => Array.from(new Set(jobs.map(j => j.industry).filter(Boolean))).sort(), [jobs]);
  const stages = useMemo(() => Array.from(new Set(jobs.map(j => j.company_stage).filter(Boolean))).sort(), [jobs]);
  const locations = useMemo(() => Array.from(new Set(jobs.map(j => j.location).filter(Boolean))).sort(), [jobs]);
  const companies = useMemo(() => Array.from(new Set(jobs.map(j => j.company).filter(Boolean))).sort(), [jobs]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-outfit uppercase tracking-tighter text-white mb-2 flex items-center gap-3">
            <Sparkles className="text-blue-500 w-10 h-10" /> JobScout <span className="text-blue-500">Agent</span>
          </h1>
          <p className="text-zinc-500 font-medium">Search across LinkedIn, Greenhouse, and Lever automatically.</p>
        </div>

        {/* Search Inputs Section */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Target Role (e.g. AI Engineer)"
              className="bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
              value={searchRole}
              onChange={(e) => setSearchRole(e.target.value)}
            />
          </div>
          <div className="relative w-full sm:w-64">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Location (e.g. Remote, SF)"
              className="bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
            />
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap w-full sm:w-auto shadow-lg shadow-blue-600/20"
          >
            {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
            Sync Agent
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-zinc-400 text-sm font-semibold mr-4 px-2 border-r border-white/10">
          <Filter className="w-4 h-4" /> VIEW FILTERS
        </div>
        
        <select 
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[140px]"
          value={filter.industry}
          onChange={(e) => setFilter(f => ({...f, industry: e.target.value}))}
        >
          <option value="all">Any Industry ({industries.length})</option>
          {industries.map(ind => <option key={ind} value={ind!}>{ind}</option>)}
        </select>

        <select 
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[140px]"
          value={filter.stage}
          onChange={(e) => setFilter(f => ({...f, stage: e.target.value}))}
        >
          <option value="all">Any Stage ({stages.length})</option>
          {stages.map(stage => <option key={stage} value={stage!}>{stage}</option>)}
        </select>

        <select 
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[140px]"
          value={filter.location}
          onChange={(e) => setFilter(f => ({...f, location: e.target.value}))}
        >
          <option value="all">Discovered Locs ({locations.length})</option>
          {locations.map(loc => <option key={loc} value={loc!}>{loc}</option>)}
        </select>

        <select 
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[140px]"
          value={filter.company}
          onChange={(e) => setFilter(f => ({...f, company: e.target.value}))}
        >
          <option value="all">Any Company ({companies.length})</option>
          {companies.map(comp => <option key={comp} value={comp!}>{comp}</option>)}
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
            <JobCard key={job.id} job={job} onSeen={handleDismiss} />
          ))}
        </div>
      ) : (
        <div className="bg-white/[0.02] border-2 border-dashed border-white/10 rounded-3xl py-32 flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <CheckCheck className="w-8 h-8 text-zinc-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">No Leads Found</h2>
          <p className="text-zinc-500 max-w-md">Try adjusting your search role or location above and click "Sync Agent" to start a fresh scan.</p>
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
        <span>Search Core: Serper + Gemini 1.5</span>
      </div>
    </main>
  );
}
