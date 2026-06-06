import { Book, GitCommit, Plus, GitBranch, AlertCircle, Lock, Star } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { RoleBadge, formatDate } from '../components/shared';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function ReposScreen({ data, openRepo, setModal }) {
  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Repositories</h2>
          <p className="text-slate-400">Manage your projects, branches, and role-based access.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-400">
            <span className="text-2xl font-bold text-white">{data.length}</span>
            <span className="ml-1">repos</span>
          </div>
        </div>
      </div>

      {Array.isArray(data) && data.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {data.map((repo, i) => (
            <div
              key={repo.id}
              onClick={() => openRepo(repo.name)}
              className="glass-card glass-card-hover cursor-pointer p-5 flex flex-col gap-4 animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Top row */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-900/40 border border-primary/20 flex items-center justify-center shrink-0">
                  {repo.is_private
                    ? <Lock className="h-4 w-4 text-primary" />
                    : <Book className="h-4 w-4 text-primary" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-100 truncate">{repo.name}</p>
                  <p className="text-xs text-slate-500">{formatRelativeTime(repo.latest_commit_time || repo.updated_at)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                  <RoleBadge role={repo.current_user_role} />
                  <Badge
                    variant={repo.is_private ? 'destructive' : 'outline'}
                    className={cn(
                      'text-[10px]',
                      !repo.is_private && 'border-green-500/30 text-green-400 bg-green-500/10'
                    )}
                  >
                    {repo.is_private ? 'Private' : 'Public'}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed min-h-[40px]">
                {repo.description || 'No description provided for this repository.'}
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/60">
                {[
                  { icon: GitCommit, label: 'Commits', value: repo.commit_count ?? 0, color: 'text-purple-400' },
                  { icon: GitBranch, label: 'Branches', value: repo.branch_count ?? 0, color: 'text-cyan-400' },
                  { icon: AlertCircle, label: 'Issues', value: repo.issue_open_count ?? 0, color: 'text-amber-400' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center gap-2 group/stat">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0 transition-transform group-hover/stat:scale-110", color)} />
                    <div>
                      <p className="text-base font-bold leading-none text-slate-200">{value}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 glass-card">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
            <Book className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No repositories found</h3>
          <p className="text-slate-500 text-sm mb-6">Create your first repository to get started.</p>
          <Button variant="outline" onClick={() => setModal('repo')} className="elastic-transition hover:scale-[1.04]">
            <Plus className="h-4 w-4 mr-2" />
            New Repository
          </Button>
        </div>
      )}
    </div>
  );
}
