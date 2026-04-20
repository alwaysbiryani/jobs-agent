import { CheckCircle, Building2, MapPin, Briefcase, Factory, ArrowUpRight, Bookmark, BookmarkCheck, Send, Users } from 'lucide-react';
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
    <div className="glass glass-hover rounded-2xl p-5 group flex flex-col h-full relative overflow-hidden">
      {/* Status Overlay Badge */}
      {(isApplied || isInterviewing) && (
        <div className="absolute top-0 right-0 pt-1 pr-1">
          <div className="bg-white text-black text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-tighter flex items-center gap-1">
            {isApplied ? <Send className="w-2.5 h-2.5" /> : <Users className="w-2.5 h-2.5" />}
            {job.interaction_status}
          </div>
        </div>
      )}

      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold font-display text-white transition-colors truncate">
            {job.title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 text-zinc-400">
            <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center border border-white/5">
              <Building2 className="w-3 h-3" />
            </div>
            <span className="text-sm font-medium truncate">{job.company}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => onSave(job.id, isSaved)}
            className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all ${
              isSaved 
                ? 'bg-white text-black border-white' 
                : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white hover:border-white/20'
            }`}
            title={isSaved ? "Unsave lead" : "Save lead"}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => onSeen(job.id)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20 transition-all"
            title="Dismiss"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <Badge icon={<MapPin className="w-3 h-3" />} label={job.location} />
        {job.company_stage && (
          <Badge icon={<Factory className="w-3 h-3" />} label={job.company_stage} />
        )}
        {job.industry && (
          <Badge icon={<Briefcase className="w-3 h-3" />} label={job.industry} />
        )}
      </div>

      {job.description_summary && (
        <div className="relative mb-6 flex-1">
          <p className="text-zinc-400 text-[13px] leading-relaxed line-clamp-3 italic pl-3 border-l-2 border-white/5">
            &quot;{job.description_summary}&quot;
          </p>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500">
          {job.source}
        </span>
        <a 
          href={job.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:underline transition-all group/link"
        >
          View Role <ArrowUpRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 text-zinc-300 border border-white/10 whitespace-nowrap">
      {icon}
      {label}
    </span>
  );
}
