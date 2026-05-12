import { Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

export function DatabaseAdminScreen({ data, load }) {
  // Fix: data returned from backend is directly the status dictionary which includes partitions
  const replication = data || {};
  const partitions = data?.partitions || [];
  const isReplicaActive = replication.state === 'streaming';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-white">Database Administration</h2>
          <p className="text-slate-400">Real-time monitoring of Streaming Replication & Table Partitioning.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load('db-admin')} className="bg-slate-900 border-slate-800">
          <Clock className="h-4 w-4 mr-2" />
          Refresh Metrics
        </Button>
      </div>

      {/* Replication Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Replica Status</CardDescription>
            <CardTitle className="flex items-center">
              {isReplicaActive ? (
                <span className="text-green-500 flex items-center"><div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse" />Streaming</span>
              ) : (
                <span className="text-red-500 flex items-center"><div className="h-2 w-2 bg-red-500 rounded-full mr-2" />Disconnected</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Sync State</CardDescription>
            <CardTitle>{replication.sync_state?.toUpperCase() || 'N/A'}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-slate-500">WAL Lag</CardDescription>
            <CardTitle className={replication.lag && replication.lag !== '0 bytes' ? "text-yellow-500" : "text-primary"}>
              {replication.lag || '0 bytes'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Partitions Table */}
      <Card className="bg-slate-900/40 border-slate-800 overflow-hidden">
        <CardHeader className="bg-slate-900/60 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Commit Table Partitions</CardTitle>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono">Range Sharding Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/40 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3 text-left">Partition Name</th>
                <th className="px-6 py-3 text-left">Rows</th>
                <th className="px-6 py-3 text-left">Disk Size</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {partitions.map((p) => (
                <tr key={p.name || p.partition_name} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-primary font-medium">{p.name || p.partition_name}</td>
                  <td className="px-6 py-4">{p.rows || p.row_count}</td>
                  <td className="px-6 py-4">{p.size}</td>
                  <td className="px-6 py-4"><Badge className="bg-green-500/10 text-green-500 border-none">Optimal</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
