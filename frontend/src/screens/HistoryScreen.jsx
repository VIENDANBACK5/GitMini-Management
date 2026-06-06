import * as React from 'react';
import { GitBranch, GitCommit, Lock, Plus, Trash2, Clock, User, Star, GitFork, Users, Shield, ChevronRight } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { formatDate, RoleBadge } from '../components/shared';
import { cn } from '../lib/utils';

export function HistoryScreen({
  data,
  selectedRepo,
  selectedBranch,
  setSelectedBranch,
  branches,
  load,
  setModal,
  selectedRepoRole,
  selectedRepoCapability,
  deleteBranch,
  loadCommitFiles,
  members,
  mayManageMembers,
  removeMember,
  starRepo,
}) {
  const commits = Array.isArray(data) ? data : [];
  const [activeTab, setActiveTab] = React.useState('commits');

  function renderBranches() {
    if (!branches.length) return null;
    return (
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-slate-300">Branches</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">{branches.length}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <div key={b.name} className="flex items-center gap-1">
              <button
                onClick={() => {
                  const next = selectedBranch === b.name ? null : b.name;
                  setSelectedBranch(next);
                  load('history', selectedRepo, next);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all elastic-transition',
                  selectedBranch === b.name
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-primary/40 hover:text-primary hover:bg-primary/5'
                )}
              >
                {b.is_protected && <Lock className="h-3 w-3" />}
                {b.name}
              </button>
              {['admin', 'owner', 'maintainer'].includes(selectedRepoRole) && b.name !== selectedRepoCapability?.default_branch && (
                <button
                  onClick={() => deleteBranch(b.name)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Commit History</h2>
          <p className="text-slate-400 text-sm">
            Linear history of changes for <code className="px-1.5 py-0.5 bg-slate-800 rounded text-primary text-xs">{selectedRepo}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={starRepo}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-amber-500/50 hover:text-amber-400 hover:bg-amber-500/5 transition-all"
          >
            <Star className="h-3.5 w-3.5" />
            Star
            <span className="text-slate-500 font-bold">{selectedRepoCapability?.stars_count || 0}</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-900/60 text-slate-400">
            <GitFork className="h-3.5 w-3.5" />
            Fork
            <span className="text-slate-500 font-bold">{selectedRepoCapability?.forks_count || 0}</span>
          </div>
          <Select
            className="w-40"
            placeholder="Branch"
            value={selectedBranch}
            onValueChange={(val) => {
              setSelectedBranch(val || null);
              load('history', selectedRepo, val || null);
            }}
            options={branches.map((b) => ({ value: b.name, label: b.name }))}
          />
          {['admin', 'owner', 'maintainer', 'developer'].includes(selectedRepoRole) && (
            <Button size="sm" onClick={() => setModal('commit')} className="elastic-transition hover:scale-[1.04] active:scale-[0.97]">
              <Plus className="h-4 w-4 mr-1.5" /> Push Commit
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {[
          { key: 'commits', icon: <GitCommit className="h-4 w-4" />, label: 'Commits' },
          { key: 'members', icon: <Users className="h-4 w-4" />, label: 'Members' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px flex items-center gap-2",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'commits' ? (
        <>
          {renderBranches()}
          {/* Timeline */}
          <div className="relative space-y-3 before:absolute before:left-[19px] before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-primary/20 before:via-slate-700 before:to-transparent">
            {commits.map((commit, i) => (
              <div
                key={commit.hash}
                className="relative flex items-start gap-4 group animate-slide-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Timeline dot */}
                <div className={cn(
                  "relative z-10 shrink-0 h-10 w-10 flex items-center justify-center rounded-full border transition-all duration-300",
                  "bg-slate-900/80 border-slate-700 group-hover:border-primary/60 group-hover:bg-primary/5 group-hover:shadow-lg group-hover:shadow-primary/10"
                )}>
                  <GitCommit className="h-4 w-4 text-slate-500 group-hover:text-primary transition-colors" />
                </div>

                {/* Commit card */}
                <div
                  className="flex-1 glass-card glass-card-hover p-4 cursor-pointer min-w-0"
                  onClick={() => loadCommitFiles(commit.hash)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-200 group-hover:text-primary transition-colors truncate">
                        {commit.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {commit.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDate(commit.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="font-mono text-[10px] py-0 h-5 border-slate-700 text-slate-400">
                        {(commit.hash || '').substring(0, 7)}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {commits.length === 0 && (
              <div className="text-center py-20 text-slate-500 pl-14">
                <GitCommit className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                No commits found for this branch.
              </div>
            )}
          </div>
        </>
      ) : (
        /* Members */
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Access Control
            </h3>
            {mayManageMembers && (
              <Button size="sm" variant="outline" onClick={() => setModal('add_member')} className="elastic-transition hover:scale-[1.03]">
                <Plus className="h-4 w-4 mr-1" /> Add Member
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {Array.isArray(members) && members.length > 0 ? (
              members.map((m, i) => (
                <div
                  key={m.user_id}
                  className="glass-card p-4 flex items-center justify-between animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-purple-900/40 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {(m.username || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200">{m.username}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Joined {formatDate(m.joined_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <RoleBadge role={m.role} />
                    {mayManageMembers && m.username !== 'admin' && (
                      <button
                        onClick={() => removeMember(m.user_id)}
                        className="text-slate-600 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-red-500/10"
                        title="Remove Member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-14 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <Users className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                No member data available.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
