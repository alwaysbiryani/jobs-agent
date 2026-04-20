"use client";

import { useState, useEffect, useCallback, useMemo, cloneElement } from "react";
import { RefreshCcw, Loader2, Sparkles, CheckCheck, MapPin, Briefcase, Search, SlidersHorizontal, ChevronDown, ListFilter, Bookmark, Send, Users, History } from "lucide-react";
import { Job, JobView } from "@/lib/types";
import { useUserId } from "@/hooks/useUserId";
import JobCard from "@/components/JobCard";
import { cn } from "@/lib/utils";

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean, 
  onClick: () => void, 
  icon: React.ReactNode, 
  label: string 
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

export default function Home() {
  const userId = useUserId();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<JobView>('new');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<{ database: string, env: any } | null>(null);
  
  const [searchRole, setSearchRole] = useState("Software Engineer");
  const [searchLocation, setSearchLocation] = useState("Remote");

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
      const res = await fetch(`/api/jobs?userId=${userId}&view=${activeTab}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);
      }
      
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      setHealthStatus(healthData);
      
      const checkRes = await fetch('/api/cron/sync?check=true');
      const checkData = await checkRes.json();
      setKeysMissing({
        serper: !healthData.env.SERPER_API_KEY,
        gemini: !healthData.env.GEMINI_API_KEY
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/cron/sync?role=${encodeURIComponent(searchRole)}&location=${encodeURIComponent(searchLocation)}`);
      const data = await res.json();
      
      if (!res.ok || data.success === false) {
        setSyncError(data.error || 'Sync failed. Check your API keys and database connection.');
      } else {
        await fetchJobs();
      }
    } catch (err) {
      console.error(err);
      setSyncError('Network error during sync.');
    } finally {
      setSyncing(false);
    }
  }, [fetchJobs, searchRole, searchLocation]);

  const handleDismiss = useCallback(async (jobId: string) => {
    try {
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, jobId, action: "dismiss" }),
      });
      if (activeTab === 'new' || activeTab === 'all') {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      } else {
        fetchJobs();
      }
    } catch (err) {
      console.error(err);
      fetchJobs();
    }
  }, [userId, activeTab, fetchJobs]);

  const handleSave = useCallback(async (jobId: string, currentlySaved: boolean) => {
    const action = currentlySaved ? 'unsave' : 'save';
    try {
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, jobId, action }),
      });
      
      if (activeTab === 'saved' && currentlySaved) {
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
              <TabButton active={activeTab === 'new'} onClick={() => setActiveTab('new')} icon={<ListFilter />} label="New" />
              <TabButton active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} icon={<Bookmark />} label="Saved" />
              <TabButton active={activeTab === 'applied'} onClick={() => setActiveTab('applied')} icon={<Send />} label="Applied" />
              <TabButton active={activeTab === 'interviewing'} onClick={() => setActiveTab('interviewing')} icon={<Users />} label="Interviewing" />
              <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} icon={<History />} label="All" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-white">
              {userId?.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-12">
        {/* Discover Hero */}
        {(activeTab === 'new' || activeTab === 'all') && (
          <section className="mb-16">
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight text-white mb-4 leading-none">
                  INTELLIGENT <br />
                  <span className="text-zinc-600">SCOUTING</span>
                </h1>
                <p className="text-zinc-500 font-medium max-w-lg text-lg">
                  Scanning verified boards for {searchRole} roles in {searchLocation}.
                </p>
              </div>

              <div className="glass p-2 rounded-2xl flex flex-col md:flex-row items-stretch gap-2 max-w-4xl mt-4 border-white/20">
                <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/5 group focus-within:border-white/40 transition-colors">
                  <Briefcase className="w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                  <input 
                    type="text"
                    placeholder="Role..."
                    className="bg-transparent border-none p-0 text-sm text-white placeholder:text-zinc-700 outline-none w-full font-bold"
                    value={searchRole}
                    onChange={(e) => setSearchRole(e.target.value)}
                  />
                </div>
                <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/5 group focus-within:border-white/40 transition-colors">
                  <MapPin className="w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                  <input 
                    type="text"
                    placeholder="Location..."
                    className="bg-transparent border-none p-0 text-sm text-white placeholder:text-zinc-700 outline-none w-full font-bold"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="bg-white text-black px-8 py-3 rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-zinc-200 active:scale-95 transition-all"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  <span className="text-xs uppercase tracking-widest">Execute Scan</span>
                </button>
              </div>

              {syncError && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{syncError}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Saved Header */}
        {activeTab === 'saved' && (
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
              onChange={(v) => setFilter(f => ({...f, industry: v}))} 
            />
            <FilterSelect 
              icon={<SlidersHorizontal className="w-3.5 h-3.5" />} 
              label="Stage" 
              value={filter.stage} 
              options={stages} 
              onChange={(v) => setFilter(f => ({...f, stage: v}))} 
            />
          </div>

          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-700 bg-white/5 px-4 py-2 rounded-full border border-white/5">
            Buffer: {filteredJobs.length} Entries
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
            {filteredJobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job} 
                onSeen={handleDismiss}
                onSave={handleSave}
              />
            ))}
          </div>
        ) : (
          <div className="glass border-dashed rounded-3xl py-32 flex flex-col items-center justify-center text-center px-6 transition-all hover:bg-white/[0.02]">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/5">
              <CheckCheck className="w-8 h-8 text-zinc-800" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 font-display uppercase tracking-tight">Queue Empty</h2>
            <p className="text-zinc-600 max-w-sm text-sm font-medium">
              No active entries found for this view.
            </p>
          </div>
        )}

        {/* API Alerts */}
        {(keysMissing.serper || keysMissing.gemini) && (
          <div className="mt-12 glass border-white/10 bg-white/5 p-6 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-tight">Config Required</h4>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Add Serper or Gemini keys to enable full agent functionality.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function FilterSelect({ icon, label, value, options, onChange }: { 
  icon: React.ReactNode, 
  label: string, 
  value: string, 
  options: string[], 
  onChange: (v: string) => void 
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
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="all">Any {label}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
