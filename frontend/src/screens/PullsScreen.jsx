import { GitPullRequest, Lock } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { StatusBadge, formatDate } from '../components/shared';

export function PullsScreen({ data, me, openPullModal, updatePull, approvePull }) {
  const pulls = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Pull Request Governance</h2>
          <p className="text-slate-400 text-sm">Manage merges with role-based approval controls.</p>
        </div>
        <Button size="sm" onClick={openPullModal}><GitPullRequest className="h-4 w-4 mr-1" />New Pull Request</Button>
      </div>
      <Card className="bg-slate-900/40 border-slate-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-500 font-semibold">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Repo</th>
              <th className="px-4 py-3">Branches</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {pulls.map((pull) => (
              <tr key={pull.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{pull.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{pull.body || 'No description'}</p>
                </td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-800 rounded text-xs font-mono">{pull.repo}</span></td>
                <td className="px-4 py-3 text-xs text-slate-400 font-mono">{pull.source_branch} → {pull.target_branch}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={pull.status} />
                    {pull.is_approved && <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs">Approved</span>}
                    {pull.target_branch_protected && <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs flex items-center gap-1"><Lock className="h-2.5 w-2.5" />Protected</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(pull.updated_at || pull.created_at)}</td>
                <td className="px-4 py-3">
                  {pull.status === 'open' && (
                    <div className="flex gap-1">
                      <button disabled={!pull.can_update} onClick={() => updatePull(pull.id, 'closed')} className="px-2 py-1 text-xs rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed">Close</button>
                      {pull.author !== me?.username && ['admin', 'owner', 'maintainer', 'reviewer'].includes(pull.current_user_role) && <button onClick={() => approvePull(pull.id)} className="px-2 py-1 text-xs rounded border border-blue-700 text-blue-400 hover:bg-blue-900/30">Approve</button>}
                      <button disabled={!pull.can_merge} onClick={() => updatePull(pull.id, 'merged')} className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">Merge</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {pulls.length === 0 && <tr><td colSpan={6} className="text-center py-16 text-slate-500">No pull requests found.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
