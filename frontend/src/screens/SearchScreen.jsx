import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { formatDate } from '../components/shared';

export function SearchScreen({ data, searchTitle, openRepo }) {
  const results = Array.isArray(data) ? data : [];
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">{searchTitle}</h2>
        <p className="text-slate-400 text-sm">Search results across commits and issues.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((res, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => res.repo && openRepo(res.repo)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{res.type}</Badge>
                <span className="text-[10px] text-slate-500 font-mono">{res.repo || 'system'}</span>
              </div>
              <CardTitle className="text-base mt-2 line-clamp-1">{res.title || res.message || res.hash}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400 line-clamp-2">{res.body || res.message || 'No description'}</p>
            </CardContent>
            <CardFooter className="pt-0 flex justify-between items-center text-[10px] text-slate-500 uppercase font-bold">
              <span>{formatDate(res.created_at)}</span>
              <ChevronRight className="h-3 w-3" />
            </CardFooter>
          </Card>
        ))}
      </div>
      {results.length === 0 && <div className="text-center py-20 text-slate-500">No results found for your query.</div>}
    </div>
  );
}
