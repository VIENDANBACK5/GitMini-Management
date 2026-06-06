import { ShieldCheck, Activity, Clock, User, Cpu } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { formatDate } from '../components/shared';
import { cn } from '../lib/utils';

const ACTION_COLORS = {
  create: 'bg-green-500/10 text-green-400 border-green-500/20',
  update: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  delete: 'bg-red-500/10 text-red-400 border-red-500/20',
  merge:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  login:  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  approve: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

function getActionStyle(action = '') {
  const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k));
  return ACTION_COLORS[key] || 'bg-slate-700/40 text-slate-300 border-slate-600';
}

export function AuditScreen({ data }) {
  const logs = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
          </div>
          <p className="text-slate-400 text-sm">Security events and administrative accountability trail.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
          <Activity className="h-3 w-3" /> {logs.length} Events
        </div>
      </div>

      {/* Log list */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="border-b border-purple-500/10 text-slate-500 text-xs tracking-wider uppercase">
            <tr>
              <th className="px-5 py-3.5 w-[20%]">Action</th>
              <th className="px-5 py-3.5 w-[15%]">Actor</th>
              <th className="px-5 py-3.5 w-[25%]">Target</th>
              <th className="px-5 py-3.5 w-[20%]">Repository</th>
              <th className="px-5 py-3.5 w-[20%]">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {logs.map((log, i) => (
              <tr
                key={log.id}
                className="hover:bg-purple-500/5 transition-colors group"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <td className="px-5 py-3.5">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                    getActionStyle(log.action)
                  )}>
                    <Cpu className="h-2.5 w-2.5" />
                    {log.action}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                      {(log.actor || 'S')[0].toUpperCase()}
                    </div>
                    <span className="text-slate-200 font-medium truncate text-xs">{log.actor || 'system'}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 shrink-0">{log.target_type}</span>
                    <span className="text-xs font-mono text-slate-400 truncate">{log.target_id}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {log.repo
                    ? <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-300 truncate block max-w-full">{log.repo}</span>
                    : <span className="text-slate-600 text-xs">system</span>
                  }
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span className="whitespace-nowrap">{formatDate(log.created_at)}</span>
                  </div>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-20">
                  <ShieldCheck className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500">No audit log events found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
