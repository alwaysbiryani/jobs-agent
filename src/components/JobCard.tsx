import { Building2, MapPin, ArrowUpRight, Bookmark, BookmarkCheck, X, Send, Users } from 'lucide-react';
import { Job } from '@/lib/types';

interface JobCardProps {
  job: Job;
  onSeen: (id: string) => void;
  onSave: (id: string, currentlySaved: boolean) => void;
}

export default function JobCard({ job, onSeen, onSave }: JobCardProps) {
  const isSaved = job.interaction_status === 'saved';
  const isApplied = job.interaction_status === 'applied';
  const isInterviewing = job.interaction_status === 'interviewing';

  return (
    <div className="blocky blocky-hover rounded-none p-4 group flex flex-col h-full relative overflow-hidden bg-black border-zinc-800">
      {/* Status Overlay Badge */}
      {(isApplied || isInterviewing) && (
        <div className="absolute top-0 right-0">
          <div className="bg-white text-black text-[8px] font-black px-2 py-0.5 uppercase tracking-tighter flex items-center gap-1">
            {isApplied ? <Send className="w-2.5 h-2.5" /> : <Users className="w-2.5 h-2.5" />}
            {job.interaction_status}
          </div>
        </div>
      )}

      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black font-display text-white uppercase tracking-tight truncate">
            {job.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-zinc-500 uppercase font-mono text-[10px] font-bold">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{job.company}</span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button 
            onClick={() => onSave(job.id, isSaved)}
            className={`w-7 h-7 flex items-center justify-center rounded-none border transition-all ${
              isSaved 
                ? 'bg-white text-black border-white' 
                : 'bg-transparent border-zinc-800 text-zinc-600 hover:text-white hover:border-zinc-400'
            }`}
            title={isSaved ? "Unsave" : "Save"}
          >
            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={() => onSeen(job.id)}
            className="w-7 h-7 flex items-center justify-center rounded-none border border-zinc-800 bg-transparent text-zinc-600 hover:text-red-500 hover:border-red-900 transition-all"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-2 py-0.5 border border-zinc-900 bg-zinc-950 text-[10px] font-mono font-bold text-zinc-400 uppercase">
          <MapPin className="w-3 h-3" />
          {job.location}
        </div>
        {job.industry && (
          <div className="px-2 py-0.5 border border-zinc-900 bg-zinc-950 text-[10px] font-mono font-bold text-zinc-500 uppercase">
            {job.industry}
          </div>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-zinc-900 flex items-center justify-between">
        <span className="text-[9px] font-black font-mono uppercase tracking-widest text-zinc-600">
          {job.source}
        </span>
        <a 
          href={job.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-black text-white hover:bg-white hover:text-black px-2 py-1 transition-all uppercase tracking-tighter"
        >
          View <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
