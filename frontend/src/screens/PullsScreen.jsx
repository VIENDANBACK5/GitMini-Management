import { GitPullRequest, Lock, Check, X, GitMerge } from 'lucide-react';
import { Button } from '../components/ui/button';
import { StatusBadge, formatDate } from '../components/shared';
import { cn } from '../lib/utils';

export function PullsScreen({ data, me, openPullModal, updatePull, approvePull }) {
  const pulls = Array.isArray(data) ? data : [];
  const openCount = pulls.filter(p => p.status === 'open').length;
  const mergedCount = pulls.filter(p => p.status === 'merged').length;
  const closedCount = pulls.filter(p => p.status === 'closed').length;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Pull Request Governance</h2>
          </div>
          <p className="text-slate-400 text-sm">Manage merges with role-based approval controls.</p>
        </div>
        <Button
          size="sm"
          onClick={openPullModal}
          className="elastic-transition hover:scale-[1.04] active:scale-[0.97]"
        >
          <GitPullRequest className="h-4 w-4 mr-1" />New Pull Request
        </Button>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
          {openCount} Open
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
          <GitMerge className="h-3 w-3" /> {mergedCount} Merged
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700/40 border border-slate-700 text-slate-400 text-xs font-medium">
          <X className="h-3 w-3" /> {closedCount} Closed
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="border-b border-purple-500/10 text-slate-500 text-xs tracking-wider uppercase">
            <tr>
              <th className="px-5 py-3.5 w-[28%]">Title</th>
              <th className="px-5 py-3.5 w-[12%]">Repo</th>
              <th className="px-5 py-3.5 w-[18%]">Branches</th>
              <th className="px-5 py-3.5 w-[10%]">Status</th>
              <th className="px-5 py-3.5 w-[10%]">Guard</th>
              <th className="px-5 py-3.5 w-[12%]">Updated</th>
              <th className="px-5 py-3.5 w-[10%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {pulls.map((pull, i) => (
              <tr
                key={pull.id}
                className="hover:bg-purple-500/5 transition-colors group"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <td className="px-5 py-3.5">
                  <p className="font-medium text-slate-200 group-hover:text-primary transition-colors truncate">{pull.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{pull.body || 'No description.'}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-300 truncate block max-w-full">{pull.repo}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <span className="text-cyan-400 truncate max-w-[5rem] inline-block align-bottom">{pull.source_branch}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-orange-400 truncate max-w-[5rem] inline-block align-bottom">{pull.target_branch}</span>
                  </span>
                </td>
                <td className="px-5 py-3.5"><StatusBadge status={pull.status} /></td>
                <td className="px-5 py-3.5">
                  {pull.target_branch_protected
                    ? <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] flex items-center gap-1 w-fit">
                        <Lock className="h-2.5 w-2.5" />Protected
                      </span>
                    : <span className="text-slate-600 text-xs">—</span>
                  }
                </td>
                <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{formatDate(pull.updated_at || pull.created_at)}</td>
                <td className="px-5 py-3.5">
                  {pull.status === 'open' && (
                    <div className="flex gap-1">
                      <button
                        disabled={!pull.can_update}
                        onClick={() => updatePull(pull.id, 'closed')}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Close PR"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      {pull.author !== me?.username && ['admin', 'owner', 'maintainer', 'reviewer'].includes(pull.current_user_role) && (
                        <button
                          onClick={() => approvePull(pull.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 rounded transition-all"
                          title="Approve PR"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        disabled={!pull.can_merge}
                        onClick={() => updatePull(pull.id, 'merged')}
                        className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Merge PR"
                      >
                        <GitMerge className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {pulls.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-20">
                  <GitPullRequest className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500">No pull requests found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
