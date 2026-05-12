import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

export function formatDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

export function formatMetadata(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) return '{}';
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(' · ');
}

export function mergeBlockedReason(reason) {
  if (reason === 'protected_branch_requires_approval') return 'Protected branch requires reviewer approval';
  if (reason === 'insufficient_role') return 'Merge requires owner or maintainer';
  if (reason === 'not_open') return 'Pull request is not open';
  return 'Merge is blocked';
}

export function canViewMembers(role) {
  return ['admin', 'owner', 'maintainer', 'developer', 'reviewer'].includes(role);
}

export function canManageMembers(role) {
  return ['admin', 'owner'].includes(role);
}

export function StatusBadge({ status }) {
  const variants = {
    open: 'default',
    success: 'default',
    closed: 'destructive',
    failed: 'destructive',
    merged: 'secondary',
    approved: 'secondary',
    running: 'outline',
    queued: 'outline',
  };
  return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
}

export function RoleBadge({ role }) {
  const variants = {
    owner: "destructive",
    admin: "destructive",
    maintainer: "default",
    developer: "secondary",
    reviewer: "outline",
    viewer: "outline",
  };
  return <Badge variant={variants[role] || "outline"} className="capitalize font-mono text-[10px]">{role}</Badge>;
}

export function StatusTag({ status }) {
  const variants = {
    open: "outline",
    closed: "secondary",
    merged: "default",
    approved: "default",
    pending: "secondary",
  };
  const colors = {
    open: "text-green-500 border-green-500/20 bg-green-500/10",
    closed: "text-red-500 border-red-500/20 bg-red-500/10",
    merged: "text-purple-500 border-purple-500/20 bg-purple-500/10",
  };
  return (
    <Badge 
      variant={variants[status] || "outline"} 
      className={cn("capitalize text-[10px]", colors[status])}
    >
      {status}
    </Badge>
  );
}

export function SectionHeader({ title, subtitle, selectedRepo, children }) {
  return (
    <div className="flex items-center justify-between space-y-2 mb-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-slate-400 text-sm">{subtitle}</p>}
        {selectedRepo && <p className="text-slate-400 text-sm">Repository: {selectedRepo}</p>}
      </div>
      <div className="flex items-center space-x-2">{children}</div>
    </div>
  );
}
