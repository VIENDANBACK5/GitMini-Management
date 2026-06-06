import { Plus, AlertCircle, GitFork, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { RoleBadge, StatusBadge, formatDate } from '../components/shared';
import { cn } from '../lib/utils';

export function IssuesScreen({ data, allRepos, issueRepoFilter, setIssueRepoFilter, openIssueModal, updateIssue }) {
  const issueRepos = (Array.isArray(allRepos) ? allRepos : []).map(r => r.name).sort();
  const filteredIssues = issueRepoFilter
    ? (Array.isArray(data) ? data : []).filter((i) => i.repo === issueRepoFilter)
    : (Array.isArray(data) ? data : []);

  const openCount = filteredIssues.filter(i => i.status === 'open').length;
  const closedCount = filteredIssues.filter(i => i.status === 'closed').length;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Global Issues Tracker</h2>
          </div>
          <p className="text-slate-400 text-sm">All visible repository issues across your workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            allowClear
            showSearch
            placeholder="Filter by repo"
            value={issueRepoFilter}
            options={issueRepos.map((r) => ({ value: r, label: r }))}
            style={{ minWidth: 200 }}
            onValueChange={(val) => setIssueRepoFilter(val ?? null)}
          />
          <Button size="sm" onClick={openIssueModal} className="elastic-transition hover:scale-[1.04] active:scale-[0.97]">
            <Plus className="h-4 w-4 mr-1" />New Issue
          </Button>
        </div>
      </div>

      {/* Summary stat pills */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
          {openCount} Open
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700/40 border border-slate-700 text-slate-400 text-xs font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500 inline-block" />
          {closedCount} Closed
        </div>
        {issueRepoFilter && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            <GitFork className="h-3 w-3" /> {issueRepoFilter}
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="border-b border-purple-500/10 text-slate-500 text-xs tracking-wider uppercase">
            <tr>
              <th className="px-5 py-3.5 w-[35%]">Issue</th>
              <th className="px-5 py-3.5 w-[15%]">Repo</th>
              <th className="px-5 py-3.5 w-[12%]">Author</th>
              <th className="px-5 py-3.5 w-[10%]">Role</th>
              <th className="px-5 py-3.5 w-[10%]">Status</th>
              <th className="px-5 py-3.5 w-[12%]">Created</th>
              <th className="px-5 py-3.5 w-[6%]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredIssues.map((issue, i) => (
              <tr
                key={issue.id}
                className="hover:bg-purple-500/5 transition-colors group"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <td className="px-5 py-3.5">
                  <p className="font-medium text-slate-200 group-hover:text-primary transition-colors truncate">
                    <span className="text-slate-500 mr-1 text-xs font-mono">#{issue.id?.substring?.(0,8) ?? issue.id}</span>
                    {issue.title}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{issue.body || 'No description provided.'}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-300 truncate block max-w-full">{issue.repo}</span>
                </td>
                <td className="px-5 py-3.5 text-slate-400 text-xs truncate">{issue.author || 'unknown'}</td>
                <td className="px-5 py-3.5"><RoleBadge role={issue.current_user_role} /></td>
                <td className="px-5 py-3.5"><StatusBadge status={issue.status} /></td>
                <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{formatDate(issue.created_at)}</td>
                <td className="px-5 py-3.5">
                  <button
                    disabled={!issue.can_update}
                    onClick={() => updateIssue(issue.id, issue.status === 'closed' ? 'open' : 'closed')}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md border transition-all elastic-transition disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap",
                      issue.status === 'open'
                        ? "border-slate-600 text-slate-300 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10"
                        : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                    )}
                  >
                    {issue.status === 'closed' ? 'Reopen' : 'Close'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredIssues.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-20">
                  <AlertCircle className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500">No issues found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
