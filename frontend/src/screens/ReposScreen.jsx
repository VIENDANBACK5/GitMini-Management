import { Book, ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { RoleBadge, formatDate } from '../components/shared';

export function ReposScreen({ data, openRepo, setModal }) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Repositories</h2>
          <p className="text-slate-400">Manage your projects, branches, and role-based access.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-500 font-medium">
          <span>Total:</span>
          <Badge variant="secondary" className="rounded-sm px-1 font-mono">{data.length}</Badge>
        </div>
      </div>

      {Array.isArray(data) && data.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.map((repo) => (
            <Card
              key={repo.id}
              className="group hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 cursor-pointer bg-slate-900/40 border-slate-800"
              onClick={() => openRepo(repo.name)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="bg-slate-800 p-2 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Book className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <RoleBadge role={repo.current_user_role} />
                    <Badge variant={repo.is_private ? "destructive" : "outline"} className="text-[10px] h-4">
                      {repo.is_private ? 'Private' : 'Public'}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="mt-4 text-xl group-hover:text-primary transition-colors">{repo.name}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[40px]">
                  {repo.description || 'No description provided for this repository.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Commits</span>
                    <span className="text-lg font-semibold">{repo.commit_count ?? 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Branches</span>
                    <span className="text-lg font-semibold">{repo.branch_count ?? 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Issues</span>
                    <span className="text-lg font-semibold">{repo.issue_open_count ?? 0}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 text-[10px] text-slate-500 font-medium flex justify-between items-center">
                <span>Last updated: {formatDate(repo.updated_at)}</span>
                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl">
          <Book className="h-12 w-12 text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-300">No repositories found</h3>
          <p className="text-slate-500 text-sm">Create your first repository to get started.</p>
          <Button variant="outline" className="mt-6" onClick={() => setModal('repo')}>
            <Plus className="h-4 w-4 mr-2" />
            New Repository
          </Button>
        </div>
      )}
    </div>
  );
}
