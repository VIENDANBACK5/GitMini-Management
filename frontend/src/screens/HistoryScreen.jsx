import * as React from 'react';
import { GitBranch, GitCommit, Lock, Plus, Trash2, Clock, User, Star, GitFork, Users, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  const [activeTab, setActiveTab] = React.useState('commits'); // 'commits' or 'members'


  function renderBranches() {
    if (!branches.length) return null;
    return (
      <Card className="bg-slate-900/40 border-slate-800 mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" /> Branches ({branches.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          {branches.map((b) => (
            <div key={b.name} className="flex items-center gap-1">
              <button
                onClick={() => {
                  const next = selectedBranch === b.name ? null : b.name;
                  setSelectedBranch(next);
                  load('history', selectedRepo, next);
                }}
                className={cn(
                  'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all',
                  selectedBranch === b.name
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                )}
              >
                {b.is_protected && <Lock className="h-3 w-3" />}
                {b.name}
              </button>
              {['admin', 'owner', 'maintainer'].includes(selectedRepoRole) && b.name !== selectedRepoCapability?.default_branch && (
                <button onClick={() => deleteBranch(b.name)} className="text-slate-600 hover:text-red-400 transition-colors p-1">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Commit History</h2>
          <p className="text-slate-400 text-sm">Linear history of changes for <code>{selectedRepo}</code>.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={starRepo} className="gap-2">
            <Star className="h-4 w-4" /> Star
            <span className="ml-1 text-slate-500">{selectedRepoCapability?.stars_count || 0}</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <GitFork className="h-4 w-4" /> Fork
            <span className="ml-1 text-slate-500">{selectedRepoCapability?.forks_count || 0}</span>
          </Button>
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
            <Button size="sm" onClick={() => setModal('commit')}>
              <Plus className="h-4 w-4 mr-2" /> Push Commit
            </Button>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('commits')}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === 'commits' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <div className="flex items-center gap-2">
            <GitCommit className="h-4 w-4" /> Commits
          </div>
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === 'members' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Members
          </div>
        </button>
      </div>

      {activeTab === 'commits' ? (
        <>
          {renderBranches()}
          <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
            {commits.map((commit) => (
              <div key={commit.hash} className="relative flex items-start group">
                <div className="absolute left-0 mt-1.5 h-10 w-10 flex items-center justify-center rounded-full bg-slate-900 border border-slate-800 z-10 group-hover:border-primary transition-colors">
                  <GitCommit className="h-4 w-4 text-slate-500 group-hover:text-primary" />
                </div>
                <Card
                  className="ml-14 flex-1 bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-sm"
                  onClick={() => loadCommitFiles(commit.hash)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                        {commit.message}
                      </CardTitle>
                      <Badge variant="outline" className="font-mono text-[10px] py-0 h-5">
                        {(commit.hash || '').substring(0, 7)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <span className="flex items-center"><User className="h-3 w-3 mr-1" /> {commit.author}</span>
                      <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {formatDate(commit.date)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
            {commits.length === 0 && <div className="text-center py-20 text-slate-500">No commits found for this branch.</div>}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Access Control
            </h3>
            {mayManageMembers && (
              <Button size="sm" variant="outline" onClick={() => setModal('add_member')}>
                <Plus className="h-4 w-4 mr-1" /> Add Member
              </Button>
            )}
          </div>
          <div className="grid gap-4">
            {Array.isArray(members) && members.length > 0 ? (
              members.map((m) => (
                <Card key={m.user_id} className="bg-slate-900/40 border-slate-800">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <div className="font-medium">{m.username}</div>
                        <div className="text-xs text-slate-500 italic">Joined {formatDate(m.joined_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <RoleBadge role={m.role} />
                      {mayManageMembers && m.username !== 'admin' && (
                        <button
                          onClick={() => removeMember(m.user_id)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                          title="Remove Member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                No member data available.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
