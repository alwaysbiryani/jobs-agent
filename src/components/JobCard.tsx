import {
  ExternalLink,
  Building2,
  MapPin,
  Users,
  Briefcase,
  Factory,
  Bookmark,
  Send,
  Handshake,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { Job, JobStatus } from '@/lib/types';

interface JobCardProps {
  job: Job;
  onAction: (id: string, action: JobStatus | 'clear') => void;
  pendingAction?: string | null;
}

export default function JobCard({ job, onAction, pendingAction }: JobCardProps) {
  const currentStatus = job.interaction_status || 'new';
  const isPending = (action: string) => pendingAction === `${job.id}:${action}`;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/[0.08] transition-all group overflow-hidden relative">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">
            {job.title}
          </h3>
          <p className="text-zinc-400 font-medium flex items-center gap-2 mt-1">
            <Building2 className="w-4 h-4" /> {job.company}
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-white/10 text-zinc-400 bg-black/20">
          {currentStatus}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-md flex items-center gap-1 border border-blue-500/20">
          <MapPin className="w-3 h-3" /> {job.location}
        </span>
        {job.company_stage && (
          <span className="bg-purple-500/10 text-purple-400 text-xs px-2 py-1 rounded-md flex items-center gap-1 border border-purple-500/20">
            <Factory className="w-3 h-3" /> {job.company_stage}
          </span>
        )}
        {job.company_size && (
          <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded-md flex items-center gap-1 border border-amber-500/20">
            <Users className="w-3 h-3" /> {job.company_size}
          </span>
        )}
        {job.industry && (
          <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-md flex items-center gap-1 border border-zinc-700">
            <Briefcase className="w-3 h-3" /> {job.industry}
          </span>
        )}
      </div>

      {(job.search_role || job.search_location) && (
        <div className="flex flex-wrap gap-2 mb-4 text-[11px] uppercase tracking-widest">
          {job.search_role && (
            <span className="px-2 py-1 rounded-md border border-white/10 bg-white/5 text-zinc-300">
              Role: {job.search_role}
            </span>
          )}
          {job.search_location && (
            <span className="px-2 py-1 rounded-md border border-white/10 bg-white/5 text-zinc-300">
              Search: {job.search_location}
            </span>
          )}
        </div>
      )}

      {job.description_summary && (
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 italic">
          &quot;{job.description_summary}&quot;
        </p>
      )}

      <a 
        href={job.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors bg-blue-400/10 px-4 py-2 rounded-lg border border-blue-400/20 w-full justify-center font-medium"
      >
        View Posting <ExternalLink className="w-3 h-3" />
      </a>

      {job.interaction_status === 'dismissed' ? (
        <button
          onClick={() => onAction(job.id, 'clear')}
          disabled={isPending('clear')}
          className="mt-3 inline-flex items-center justify-center gap-2 text-sm text-zinc-200 hover:text-white transition-colors bg-zinc-700/70 px-4 py-2 rounded-lg border border-zinc-600/50 w-full font-medium disabled:opacity-60"
        >
          <RotateCcw className="w-4 h-4" /> Restore to New
        </button>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => onAction(job.id, 'saved')}
            disabled={isPending('saved')}
            className={`inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 ${
              job.interaction_status === 'saved'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-900 text-zinc-300 border-white/10 hover:bg-zinc-800'
            }`}
          >
            <Bookmark className="w-3 h-3" /> Save
          </button>
          <button
            onClick={() => onAction(job.id, 'applied')}
            disabled={isPending('applied')}
            className={`inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 ${
              job.interaction_status === 'applied'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-zinc-900 text-zinc-300 border-white/10 hover:bg-zinc-800'
            }`}
          >
            <Send className="w-3 h-3" /> Applied
          </button>
          <button
            onClick={() => onAction(job.id, 'interviewing')}
            disabled={isPending('interviewing')}
            className={`inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 ${
              job.interaction_status === 'interviewing'
                ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                : 'bg-zinc-900 text-zinc-300 border-white/10 hover:bg-zinc-800'
            }`}
          >
            <Handshake className="w-3 h-3" /> Interview
          </button>
          <button
            onClick={() => onAction(job.id, 'dismissed')}
            disabled={isPending('dismissed')}
            className="inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 bg-zinc-900 text-zinc-300 border-white/10 hover:bg-zinc-800"
          >
            <XCircle className="w-3 h-3" /> Dismiss
          </button>
        </div>
      )}
      
      <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none uppercase text-[10px] tracking-widest font-black text-white/50">
        Source: {job.source}
      </div>
    </div>
  );
}
