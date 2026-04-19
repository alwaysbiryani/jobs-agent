"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCcw, Filter, Loader2, Sparkles, CheckCheck } from "lucide-react";
import { Job } from "@/lib/types";
import { useUserId } from "@/hooks/useUserId";
import JobCard from "@/components/JobCard";

export default function Home() {
  const userId = useUserId();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState({
    industry: "all",
    stage: "all",
    size: "all"
  });

  const fetchJobs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?userId=${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);
      }
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
      await fetch("/api/cron/sync"); // Simple test sync
      await fetchJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  }, [fetchJobs]);

  const handleDismiss = useCallback(async (jobId: string) => {
    // Optimistic update
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    try {
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, jobId, action: "dismiss" }),
      });
    } catch (err) {
      console.error(err);
      fetchJobs(); // Revert on error
    }
  }, [userId, fetchJobs]);

  const filteredJobs = jobs.filter(job => {
    if (filter.industry !== "all" && job.industry !== filter.industry) return false;
    if (filter.stage !== "all" && job.company_stage !== filter.stage) return false;
    if (filter.size !== "all" && job.company_size !== filter.size) return false;
    return true;
  });

  const industries = Array.from(new Set(jobs.map(j => j.industry).filter(Boolean)));
  const stages = Array.from(new Set(jobs.map(j => j.company_stage).filter(Boolean)));

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-outfit uppercase tracking-tighter text-white mb-2 flex items-center gap-3">
            <Sparkles className="text-blue-500 w-10 h-10" /> JobScout <span className="text-blue-500">Agent</span>
          </h1>
          <p className="text-zinc-500 font-medium">Automated intelligence for your next career move.</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
          Sync New Postings
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-zinc-400 text-sm font-semibold mr-4 px-2 border-r border-white/10">
          <Filter className="w-4 h-4" /> FILTERS
        </div>
        
        <select 
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/50"
          value={filter.industry}
          onChange={(e) => setFilter(f => ({...f, industry: e.target.value}))}
        >
          <option value="all">All Industries</option>
          {industries.map(ind => <option key={ind} value={ind!}>{ind}</option>)}
        </select>

        <select 
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/50"
          value={filter.stage}
          onChange={(e) => setFilter(f => ({...f, stage: e.target.value}))}
        >
          <option value="all">Any Stage</option>
          {stages.map(stage => <option key={stage} value={stage!}>{stage}</option>)}
        </select>

        <div className="flex-1" />
        <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
          {filteredJobs.length} results found
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
          <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">Inbox Zero</h2>
          <p className="text-zinc-500 max-w-md">All current job postings have been processed or filtered. Click sync to check for new opportunities.</p>
        </div>
      )}

      {/* User Status Bar */}
      <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-600 text-[10px] font-mono tracking-widest uppercase">
        <span>Identity: {userId?.slice(0, 8)}...</span>
        <span>Auto-Sync Frequency: 6h</span>
        <span>Agent v1.0.0 Stable</span>
      </div>
    </main>
  );
}
