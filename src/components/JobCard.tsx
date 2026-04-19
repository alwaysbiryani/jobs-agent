import { ExternalLink, CheckCircle, Building2, MapPin, Users, Briefcase, Factory } from 'lucide-react';
import { Job } from '@/lib/types';

interface JobCardProps {
  job: Job;
  onSeen: (id: string) => void;
}

export default function JobCard({ job, onSeen }: JobCardProps) {
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
        <button 
          onClick={() => onSeen(job.id)}
          className="text-zinc-500 hover:text-green-400 transition-colors p-2 hover:bg-green-400/10 rounded-full"
          title="Mark as seen"
        >
          <CheckCircle className="w-6 h-6" />
        </button>
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
      
      <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none uppercase text-[10px] tracking-widest font-black text-white/50">
        Source: {job.source}
      </div>
    </div>
  );
}
