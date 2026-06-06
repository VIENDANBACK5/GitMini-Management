import { Clock, Database, HardDrive, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

export function DatabaseAdminScreen({ data, load }) {
  const replication = data || {};
  const partitions = data?.partitions || [];
  const isReplicaActive = replication.state === 'streaming';

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-slide-up relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight text-gradient">
            Database Administration
          </h2>
          <p className="text-slate-400 text-sm">Real-time monitoring of Streaming Replication & Table Partitioning.</p>
        </div>
        <Button 
          onClick={() => load('db-admin')} 
          className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 backdrop-blur-md rounded-xl transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
        >
          <RefreshCw className="h-4 w-4 mr-2 animate-spin-slow" />
          Refresh Metrics
        </Button>
      </div>

      {/* Replication Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="glass-card glass-card-hover elastic-transition p-6 flex flex-col justify-between h-36">
          <div className="text-[10px] uppercase font-black tracking-widest text-slate-500">Replica Status</div>
          <div className="text-2xl font-black tracking-tight mt-auto">
            {isReplicaActive ? (
              <span className="text-emerald-400 flex items-center gap-2">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 pulse-badge-green"></span>
                </span>
                Streaming
              </span>
            ) : (
              <span className="text-rose-500 flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-rose-500 pulse-badge-red"></span>
                Disconnected
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">Read-Write Splitting Active</div>
        </div>

        {/* Sync State Card */}
        <div className="glass-card glass-card-hover elastic-transition p-6 flex flex-col justify-between h-36">
          <div className="text-[10px] uppercase font-black tracking-widest text-slate-500">Sync State</div>
          <div className="text-2xl font-black text-purple-300 tracking-tight mt-auto">
            {replication.sync_state?.toUpperCase() || 'OFFLINE'}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">Streaming Protocol: WAL</div>
        </div>

        {/* WAL Lag Card */}
        <div className="glass-card glass-card-hover elastic-transition p-6 flex flex-col justify-between h-36">
          <div className="text-[10px] uppercase font-black tracking-widest text-slate-500">WAL Lag</div>
          <div className={`text-2xl font-black tracking-tight mt-auto ${replication.lag && replication.lag !== '0 bytes' ? "text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "text-emerald-400"}`}>
            {replication.lag || '0 bytes'}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">Replica Synchronization Lag</div>
        </div>
      </div>

      {/* Partitions Table */}
      <div className="glass-card overflow-hidden border border-purple-500/10">
        <div className="p-6 border-b border-purple-500/10 bg-purple-950/20 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-purple-400" />
              Commit Table Partitions
            </h3>
            <p className="text-xs text-slate-400 mt-1">Automatic time-range based vertical partitioning in PostgreSQL.</p>
          </div>
          <Badge className="bg-purple-500/10 text-purple-300 border border-purple-500/20">Optimal Performance</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-purple-950/10 text-slate-400 border-b border-purple-500/10">
              <tr>
                <th className="px-6 py-4 text-left font-black tracking-wider text-[11px] uppercase">Partition Name</th>
                <th className="px-6 py-4 text-left font-black tracking-wider text-[11px] uppercase">Row Count</th>
                <th className="px-6 py-4 text-left font-black tracking-wider text-[11px] uppercase">Disk Size</th>
                <th className="px-6 py-4 text-left font-black tracking-wider text-[11px] uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {partitions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    No active partitions found.
                  </td>
                </tr>
              ) : (
                partitions.map((p, idx) => (
                  <tr key={p.name || p.partition_name} className="hover:bg-purple-500/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-purple-300 font-semibold">{p.name || p.partition_name}</td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{p.rows || p.row_count}</td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{p.size}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active Indexing
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

