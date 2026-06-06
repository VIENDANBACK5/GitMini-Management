import { ChevronRight } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { formatDate } from '../components/shared';

export function SearchScreen({ data, searchTitle, openRepo }) {
  const results = Array.isArray(data) ? data : [];
  return (
    <div className="space-y-6 animate-slide-up relative z-10">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-gradient">{searchTitle}</h2>
        <p className="text-slate-400 text-sm">Search results across commits and issues.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((res, i) => (
          <div 
            key={i} 
            className="glass-card glass-card-hover elastic-transition p-6 cursor-pointer flex flex-col justify-between" 
            style={{ animationDelay: `${i * 45}ms` }}
            onClick={() => res.repo && openRepo(res.repo)}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/20 uppercase font-black tracking-wider text-[9px]">{res.type}</Badge>
                <span className="text-[10px] text-slate-500 font-mono font-bold">{res.repo || 'system'}</span>
              </div>
              <h3 className="text-base font-bold text-slate-200 line-clamp-1">{res.title || res.message || res.hash}</h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{res.body || res.message || 'No description provided'}</p>
            </div>
            <div className="pt-4 border-t border-purple-500/10 flex justify-between items-center text-[10px] text-slate-500 uppercase font-bold mt-4">
              <span>{formatDate(res.created_at)}</span>
              <ChevronRight className="h-4 w-4 text-purple-400 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>
      {results.length === 0 && <div className="text-center py-20 text-slate-500">No results found for your query.</div>}
    </div>
  );
}

