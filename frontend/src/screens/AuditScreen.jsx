import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { formatDate } from '../components/shared';

export function AuditScreen({ data }) {
  const logs = Array.isArray(data) ? data : [];
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-slate-400 text-sm">Security events and administrative accountability trail.</p>
      </div>
      <Card className="bg-slate-900/40 border-slate-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-500 font-semibold">
            <tr>
              <th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">Actor</th>
              <th className="px-6 py-3">Target</th>
              <th className="px-6 py-3">Repository</th>
              <th className="px-6 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4"><Badge variant="secondary">{log.action}</Badge></td>
                <td className="px-6 py-4 font-medium">{log.actor || 'system'}</td>
                <td className="px-6 py-4 text-slate-400">{log.target_type} {log.target_id}</td>
                <td className="px-6 py-4 text-slate-400">{log.repo || 'system'}</td>
                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
