import { Book, GitCommit, Plus, GitBranch, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { RoleBadge, formatDate } from '../components/shared';
import { formatRelativeTime } from '@/lib/utils';

export function ReposScreen({ data, openRepo, setModal }) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Repositories</h2>
          <p className="text-slate-400">Manage your projects, branches, and role-based access.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-white font-medium">
          <span>Total:</span>
          <span className="font-bold text-xl">{data.length}</span>
        </div>
      </div>

      {Array.isArray(data) && data.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.map((repo) => (
            <Card
              key={repo.id}
              className="group hover:border-border/60 transition-all cursor-pointer"
              onClick={() => openRepo(repo.name)}
            >
              <CardContent className="p-5">
                {/* Header row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Book className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{repo.name}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(repo.latest_commit_time || repo.updated_at)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <RoleBadge role={repo.current_user_role} />
                    <Badge variant={repo.is_private ? "destructive" : "outline"}>
                      {repo.is_private ? 'Private' : 'Public'}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[38px] mb-4">
                  {repo.description || 'No description provided for this repository.'}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                  {[
                    { icon: GitCommit, label: 'Commits', value: repo.commit_count ?? 0 },
                    { icon: GitBranch, label: 'Branches', value: repo.branch_count ?? 0 },
                    { icon: AlertCircle, label: 'Issues', value: repo.issue_open_count ?? 0 },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-base font-medium leading-none">{value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
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
