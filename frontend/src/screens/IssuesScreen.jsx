import { Plus } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { RoleBadge, StatusBadge, formatDate } from '../components/shared';

export function IssuesScreen({ data, allRepos, issueRepoFilter, setIssueRepoFilter, openIssueModal, updateIssue }) {
  const issueRepos = (Array.isArray(allRepos) ? allRepos : []).map(r => r.name).sort();
  const filteredIssues = issueRepoFilter
    ? (Array.isArray(data) ? data : []).filter((i) => i.repo === issueRepoFilter)
    : (Array.isArray(data) ? data : []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Global Issues Tracker</h2>
          <p className="text-slate-400 text-sm">All visible repository issues.</p>
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
          <Button size="sm" onClick={openIssueModal}><Plus className="h-4 w-4 mr-1" />New Issue</Button>
        </div>
      </div>
      <Card className="bg-slate-900/40 border-slate-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-500 font-semibold">
            <tr>
              <th className="px-4 py-3">Issue</th>
              <th className="px-4 py-3">Repo</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredIssues.map((issue) => (
              <tr key={issue.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">#{issue.id} {issue.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{issue.body || 'No description'}</p>
                </td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-800 rounded text-xs font-mono">{issue.repo}</span></td>
                <td className="px-4 py-3 text-slate-400">{issue.author || 'unknown'}</td>
                <td className="px-4 py-3"><RoleBadge role={issue.current_user_role} /></td>
                <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(issue.created_at)}</td>
                <td className="px-4 py-3">
                  <button
                    disabled={!issue.can_update}
                    onClick={() => updateIssue(issue.id, issue.status === 'closed' ? 'open' : 'closed')}
                    className="px-3 py-1 text-xs rounded-md border border-slate-700 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {issue.status === 'closed' ? 'Reopen' : 'Close'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredIssues.length === 0 && <tr><td colSpan={7} className="text-center py-16 text-slate-500">No issues found.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
