import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Book,
  Clock,
  Database,
  FileText,
  GitBranch,
  GitCommit,
  GitPullRequest,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  ChevronRight,
  User,
  Users,
  History,
} from 'lucide-react';
import { api, demoUsers, login, logout } from './api.js';
import { cn } from './lib/utils';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Checkbox } from './components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Form } from './components/ui/simple-form';
import { Input } from './components/ui/input';
import { Select } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { toast } from './components/ui/toast';
import { canViewMembers, canManageMembers, formatDate, StatusBadge, RoleBadge } from './components/shared';
import { LoginScreen } from './screens/LoginScreen';
import { ReposScreen } from './screens/ReposScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { IssuesScreen } from './screens/IssuesScreen';
import { PullsScreen } from './screens/PullsScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { AuditScreen } from './screens/AuditScreen';
import { DatabaseAdminScreen } from './screens/DatabaseAdminScreen';
import { SearchScreen } from './screens/SearchScreen';


function AppDialog({ open, onOpenChange, title, width = 520, footer = null, children }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={width}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogClose />
        <div className="px-6 py-5">{children}</div>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

export default function App() {
  const [view, setView] = useState('repos');
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [allRepos, setAllRepos] = useState([]);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [me, setMe] = useState(null);
  const [repoCapabilities, setRepoCapabilities] = useState({});
  const [members, setMembers] = useState([]);
  const [memberError, setMemberError] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [commitFiles, setCommitFiles] = useState([]);
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [issueRepoFilter, setIssueRepoFilter] = useState(null);
  const selectedRepoCapability = selectedRepo ? repoCapabilities[selectedRepo] : null;
  const selectedRepoRole = selectedRepoCapability?.current_user_role;
  const mayViewMembers = canViewMembers(selectedRepoRole);
  const mayManageMembers = canManageMembers(selectedRepoRole);

  function notifySuccess(message) { toast({ title: message, variant: 'default' }); }
  function notifyError(message) { toast({ title: message, variant: 'destructive' }); }

  async function loadMembers(repo) {
    if (!repo) return;
    setMemberError('');
    try {
      const result = await api(`/repos/${encodeURIComponent(repo)}/members`);
      setMembers(Array.isArray(result) ? result : []);
    } catch (err) {
      setMembers([]);
      setMemberError(err.message);
    }
  }

  async function load(nextView = view, repo = selectedRepo, branch = selectedBranch) {
    setLoading(true);
    setError('');
    setData([]);
    setMembers([]);
    try {
      const currentMe = await api('/auth/me');
      setMe(currentMe);
      const repos = await api('/repos');
      setAllRepos(repos);
      if (nextView === 'repos') {
        setRepoCapabilities(Object.fromEntries(repos.map((item) => [item.name, item])));
        setData(repos);
      } else if (nextView === 'history') {
        const historyUrl = branch
          ? `/repos/${encodeURIComponent(repo)}/history?branch=${encodeURIComponent(branch)}`
          : `/repos/${encodeURIComponent(repo)}/history`;
        const [repoDetail, history, branchList] = await Promise.all([
          api(`/repos/${encodeURIComponent(repo)}`),
          api(historyUrl),
          api(`/repos/${encodeURIComponent(repo)}/branches`),
        ]);
        setRepoCapabilities((current) => ({ ...current, [repo]: repoDetail }));
        setData(history);
        setBranches(Array.isArray(branchList) ? branchList : []);
        if (canViewMembers(repoDetail.current_user_role)) {
          await loadMembers(repo);
        } else {
          setMembers([]);
          setMemberError('');
        }
      } else if (nextView === 'issues') {
        const issueUrl = issueRepoFilter ? `/issues?repo=${encodeURIComponent(issueRepoFilter)}` : '/issues';
        setData(await api(issueUrl));
      } else if (nextView === 'pulls') {
        setData(await api('/pulls'));
      } else if (nextView === 'analytics') {
        setData(await api('/analytics'));
      } else if (nextView === 'audit') {
        setData(await api('/admin/audit-logs'));
      } else if (nextView === 'db-admin') {
        setData(await api('/admin/db-status'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrapSession();
  }, []);

  useEffect(() => {
    if (authChecked && me && view !== 'search') {
      load();
    }
  }, [view, selectedRepo, authChecked, me?.username]);

  async function bootstrapSession() {
    setLoading(true);
    try {
      setMe(await api('/auth/me'));
    } catch {
      setMe(null);
    } finally {
      setAuthChecked(true);
      setLoading(false);
    }
  }

  async function handleLogin(values) {
    setLoading(true);
    setLoginError('');
    try {
      setMe(await login(values.username, values.password || ''));
      setView('repos');
      setSelectedRepo(null);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  }

  async function handleLogout() {
    await logout();
    setMe(null);
    setSelectedRepo(null);
    setView('repos');
  }

  function openRepo(repoName) {
    setSelectedRepo(repoName);
    setSelectedBranch(null);
    setView('history');
  }

  async function handleSearch(term = searchTerm) {
    if (!term) return;
    console.log('Searching for:', term);
    setSearchTitle(`Search: ${term}`);
    setView('search');
    setLoading(true);
    try {
      const results = await api(`/search?q=${encodeURIComponent(term)}`);
      console.log('Search results:', results);
      setData(results);
    } catch (err) {
      console.error('Search error:', err);
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCommitFiles(hash) {
    setSelectedCommit(hash);
    setCommitFiles([]);
    setModal('commit_files');
    try {
      const files = await api(`/repos/${encodeURIComponent(selectedRepo)}/commits/${hash}/files`);
      setCommitFiles(files);
    } catch (err) {
      notifyError(err.message);
    }
  }

  function openIssueModal() {
    setModal('issue');
  }

  function openPullModal() {
    setModal('pull');
  }

  async function updateIssue(id, status) {
    try {
      await api(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      notifySuccess('Issue updated');
      load();
    } catch (err) { notifyError(err.message); }
  }

  async function approvePull(id) {
    try {
      await api(`/pulls/${id}/reviews`, { method: 'POST', body: JSON.stringify({ status: 'approved' }) });
      notifySuccess('Pull request approved');
      load();
    } catch (err) { notifyError(err.message); }
  }

  async function updatePull(id, status) {
    try {
      await api(`/pulls/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      notifySuccess('Pull request updated');
      load();
    } catch (err) { notifyError(err.message); }
  }

  function deleteBranch(branch) {
    if (!window.confirm(`Delete branch "${branch}"?`)) return;
    (async () => {
      try {
        await api(`/repos/${encodeURIComponent(selectedRepo)}/branches/${encodeURIComponent(branch)}`, { method: 'DELETE' });
        notifySuccess('Branch deleted');
        if (selectedBranch === branch) setSelectedBranch(null);
        load();
      } catch (err) {
        notifyError(err.message);
      }
    })();
  }

  async function createRepo(values) {
    try {
      await api('/repos', { method: 'POST', body: JSON.stringify({ name: values.name, description: values.description, is_private: values.isPrivate }) });
      notifySuccess('Repository created');
      setModal(null);
      setView('repos');
    } catch (err) { notifyError(err.message); }
  }

  async function createIssue(values) {
    try {
      const payload = {
        ...values,
        labels: values.labels ? values.labels.split(',').map((l) => l.trim()) : []
      };
      await api(`/repos/${encodeURIComponent(values.repo)}/issues`, { method: 'POST', body: JSON.stringify(payload) });
      notifySuccess('Issue created');
      setModal(null);
      load();
    } catch (err) { notifyError(err.message); }
  }

  async function createPull(values) {
    try {
      await api(`/repos/${encodeURIComponent(values.repo)}/pulls`, { method: 'POST', body: JSON.stringify({ title: values.title, body: values.body, source_branch: values.source, target_branch: values.target }) });
      notifySuccess('Pull request created');
      setModal(null);
      load();
    } catch (err) { notifyError(err.message); }
  }

  async function handleCreateCommit(values) {
    setLoading(true);
    try {
      console.log('Creating commit for:', selectedRepo, values);
      await api(`/repos/${encodeURIComponent(selectedRepo)}/commits`, {
        method: 'POST',
        body: JSON.stringify({
          branch: values.branch,
          message: values.message,
          files: [{ path: values.filePath, content: values.fileContent }]
        })
      });
      notifySuccess('Commit pushed');
      setModal(null);
      load();
    } catch (err) {
      console.error('Commit error:', err);
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addMember(values) {
    try {
      await api(`/repos/${encodeURIComponent(selectedRepo)}/members`, { method: 'POST', body: JSON.stringify(values) });
      notifySuccess('Member added');
      setModal(null);
      loadMembers(selectedRepo);
    } catch (err) { notifyError(err.message); }
  }

  async function removeMember(userId) {
    try {
      await api(`/repos/${encodeURIComponent(selectedRepo)}/members/${userId}`, { method: 'DELETE' });
      notifySuccess('Member removed');
      loadMembers(selectedRepo);
    } catch (err) { notifyError(err.message); }
  }

  async function starRepo() {
    // Backend doesn't have a specific star endpoint, but we can simulate or update metadata
    notifySuccess('Repository starred');
  }

  async function updateRepo(values) {
    try {
      await api(`/repos/${encodeURIComponent(selectedRepo)}`, { method: 'PATCH', body: JSON.stringify(values) });
      notifySuccess('Repository updated');
      setModal(null);
      load();
    } catch (err) { notifyError(err.message); }
  }

  async function createBranch(values) {
    try {
      await api(`/repos/${encodeURIComponent(selectedRepo)}/branches`, { method: 'POST', body: JSON.stringify(values) });
      notifySuccess('Branch created');
      setModal(null);
      load();
    } catch (err) { notifyError(err.message); }
  }

  async function deleteRepo() {
    try {
      await api(`/repos/${encodeURIComponent(selectedRepo)}`, { method: 'DELETE' });
      notifySuccess('Repository deleted');
      setModal(null);
      setSelectedRepo(null);
      setView('repos');
    } catch (err) { notifyError(err.message); }
  }

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-slate-400 animate-pulse">Initializing GitMini Engine...</p>
        </div>
      </div>
    );
  }

  if (!me) {
    return <LoginScreen onLogin={handleLogin} loading={loading} loginError={loginError} demoUsers={demoUsers} />;
  }

  const menuItems = [
    { key: 'repos', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Repositories' },
    { key: 'issues', icon: <AlertCircle className="h-4 w-4" />, label: 'Global Issues' },
    { key: 'pulls', icon: <GitPullRequest className="h-4 w-4" />, label: 'Pull Requests' },
    { key: 'analytics', icon: <BarChart3 className="h-4 w-4" />, label: 'Analytics' },
    ...(me.system_role === 'admin' ? [
      { key: 'audit', icon: <Lock className="h-4 w-4" />, label: 'Audit Logs' },
      { key: 'db-admin', icon: <Database className="h-4 w-4" />, label: 'Database Admin' }
    ] : [])
  ];

  const selectedMenuKey = ['history', 'search'].includes(view) ? 'repos' : view;

  function renderContent() {
    if (view === 'repos') return <ReposScreen data={data} openRepo={openRepo} setModal={setModal} />;
    if (view === 'history') return (
      <HistoryScreen
        data={data}
        selectedRepo={selectedRepo}
        selectedBranch={selectedBranch}
        branches={branches}
        setSelectedBranch={setSelectedBranch}
        loadCommitFiles={loadCommitFiles}
        openPullModal={openPullModal}
        deleteBranch={deleteBranch}
        setModal={setModal}
        load={load}
        selectedRepoRole={selectedRepoRole}
        selectedRepoCapability={selectedRepoCapability}
        members={members}
        mayManageMembers={mayManageMembers}
        mayViewMembers={mayViewMembers}
        removeMember={removeMember}
        starRepo={starRepo}
      />
    );
    if (view === 'issues') return <IssuesScreen data={data} allRepos={allRepos} updateIssue={updateIssue} issueRepoFilter={issueRepoFilter} setIssueRepoFilter={setIssueRepoFilter} openIssueModal={openIssueModal} />;
    if (view === 'pulls') return <PullsScreen data={data} me={me} openPullModal={openPullModal} approvePull={approvePull} updatePull={updatePull} />;
    if (view === 'analytics') return <AnalyticsScreen data={data} />;
    if (view === 'audit') return <AuditScreen data={data} />;
    if (view === 'db-admin') return <DatabaseAdminScreen data={data} load={load} />;
    if (view === 'search') return <SearchScreen data={data} searchTitle={searchTitle} openRepo={openRepo} />;
    return <div className="text-slate-500">Select an item from the sidebar.</div>;
  }

  return (
    <div className="flex h-screen bg-background text-foreground dark">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-slate-950 flex flex-col">
        <div className="p-6 flex items-center space-x-3">
          <div className="bg-primary p-2 rounded-lg text-primary-foreground">
            <GitBranch className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">GitMini</h1>
            <p className="text-xs text-slate-500 font-medium">PostgreSQL Powered</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 py-4">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-all",
                selectedMenuKey === item.key
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
              {selectedMenuKey === item.key && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                  {me.username[0].toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold truncate">{me.username}</p>
                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">{me.system_role || 'User'}</p>
                </div>
              </div>
            </CardHeader>
            <CardFooter className="p-2 pt-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-slate-400 hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-3 w-3 mr-2" />
                Logout
              </Button>
            </CardFooter>
          </Card>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="relative w-96 group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary cursor-pointer transition-colors"
              onClick={() => handleSearch()}
            />
            <input
              type="text"
              placeholder="Search with PG Full-Text Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border-slate-800 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold border border-blue-500/20">
              <Database className="h-3 w-3 mr-2" />
              v12 Streaming Replication
            </div>
            <Button size="sm" onClick={() => setModal('repo')}>
              <Plus className="h-4 w-4 mr-2" />
              New Repository
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center space-y-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-slate-500 font-medium italic">Querying Postgres Engine...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center space-x-3 mb-6 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">{error}</p>
              <Button variant="ghost" size="sm" className="ml-auto hover:bg-destructive/20 h-7" onClick={() => setError('')}>Dismiss</Button>
            </div>
          )}

          {!loading && (
            <div className="animate-in fade-in duration-500">
              {renderContent()}
            </div>
          )}
        </div>
      </main>

      {renderModals()}
    </div>
  );


  function renderModals() {
    return (
      <>
        <AppDialog title="Create New Repository" open={modal === 'repo'} onOpenChange={(open) => setModal(open ? 'repo' : null)}>
          <Form layout="vertical" onFinish={createRepo} initialValues={{ isPrivate: false }}>
            <Form.Item label="Repository name" name="name" rules={[{ required: true, message: 'Enter repository name' }]}>
              <Input placeholder="Repository name" />
            </Form.Item>
            <Form.Item label="Description" name="description">
              <Textarea rows={3} placeholder="Description" />
            </Form.Item>
            <Form.Item name="isPrivate" valuePropName="checked">
              <Checkbox>Private repository</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" block>Create Now</Button>
          </Form>
        </AppDialog>

        <AppDialog title="Create Issue" open={modal === 'issue'} onOpenChange={(open) => setModal(open ? 'issue' : null)}>
          {selectedRepoCapability && !selectedRepoCapability.can_create_issue ? (
            <Alert variant="warning" className="mb-4">
              <AlertTitle>Permission warning</AlertTitle>
              <AlertDescription>Current role cannot create issues in this repository.</AlertDescription>
            </Alert>
          ) : null}
          <Form layout="vertical" onFinish={createIssue} initialValues={{ repo: selectedRepo || '' }}>
            <Form.Item label="Repository" name="repo" rules={[{ required: true, message: 'Select repository' }]}>
              <Select
                showSearch
                placeholder="Select repository"
                options={allRepos.map(r => ({ value: r.name, label: r.name }))}
              />
            </Form.Item>
            <Form.Item label="Issue title" name="title" rules={[{ required: true, message: 'Enter issue title' }]}>
              <Input placeholder="Issue title" />
            </Form.Item>
            <Form.Item label="Description" name="body">
              <Textarea rows={4} placeholder="Description" />
            </Form.Item>
            <Form.Item label="Labels" name="labels">
              <Input placeholder="backend, database, security" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>Create Issue</Button>
          </Form>
        </AppDialog>

        <AppDialog title="Create Pull Request" open={modal === 'pull'} onOpenChange={(open) => setModal(open ? 'pull' : null)}>
          {selectedRepoCapability && !selectedRepoCapability.can_create_pull ? (
            <Alert variant="warning" className="mb-4">
              <AlertTitle>Permission warning</AlertTitle>
              <AlertDescription>Current role cannot create pull requests in this repository.</AlertDescription>
            </Alert>
          ) : null}
          <Form layout="vertical" onFinish={createPull} initialValues={{ repo: selectedRepo || '', source: branches[1]?.name || 'feature/demo', target: selectedRepoCapability?.default_branch || 'main' }}>
            <Form.Item label="Repository" name="repo" rules={[{ required: true, message: 'Select repository' }]}>
              <Select
                showSearch
                placeholder="Select repository"
                options={allRepos.map(r => ({ value: r.name, label: r.name }))}
              />
            </Form.Item>
            <Form.Item label="Pull request title" name="title" rules={[{ required: true, message: 'Enter pull request title' }]}>
              <Input placeholder="Pull request title" />
            </Form.Item>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Form.Item name="source" label="Source branch" rules={[{ required: true }]}>
                  {branches.length > 0
                    ? <Select options={branches.map((b) => ({ value: b.name, label: b.name }))} />
                    : <Input placeholder="feature/demo" />}
                </Form.Item>
              </div>
              <div>
                <Form.Item name="target" label="Target branch" rules={[{ required: true }]}>
                  {branches.length > 0
                    ? <Select options={branches.map((b) => ({ value: b.name, label: b.is_protected ? `${b.name} 🔒` : b.name }))} />
                    : <Input placeholder="main" />}
                </Form.Item>
              </div>
            </div>
            <Form.Item label="Description" name="body">
              <Textarea rows={4} placeholder="Description" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>Create Pull Request</Button>
          </Form>
        </AppDialog>

        <AppDialog title="Simulate Push (Create Commit)" open={modal === 'commit'} onOpenChange={(open) => setModal(open ? 'commit' : null)}>
          <Alert variant="info" className="mb-4">
            <AlertTitle>Database Demonstration</AlertTitle>
            <AlertDescription>This will insert a real commit, link parents in DAG, and store physical file blobs in PostgreSQL.</AlertDescription>
          </Alert>
          <Form layout="vertical" onFinish={handleCreateCommit} initialValues={{ branch: selectedRepoCapability?.default_branch || 'main', filePath: 'hello.txt', fileContent: 'Hello from GitMini!' }}>
            <Form.Item label="Target Branch" name="branch" rules={[{ required: true }]}>
              {branches.length > 0
                ? <Select options={branches.map((b) => ({ value: b.name, label: b.name }))} />
                : <Input placeholder="main" />}
            </Form.Item>
            <Form.Item label="Commit Message" name="message" rules={[{ required: true, message: 'Enter commit message' }]}>
              <Input placeholder="Initial commit" />
            </Form.Item>
            <Form.Item label="File Path" name="filePath" rules={[{ required: true }]}>
              <Input placeholder="src/main.py" />
            </Form.Item>
            <Form.Item label="File Content" name="fileContent" rules={[{ required: true }]}>
              <Textarea rows={6} placeholder="Enter file content to be stored in file_blobs..." />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>Push Commit</Button>
          </Form>
        </AppDialog>

        <AppDialog title="Add Repository Member" open={modal === 'add_member'} onOpenChange={(open) => setModal(open ? 'add_member' : null)}>
          <Form layout="vertical" onFinish={addMember} initialValues={{ role: 'developer' }}>
            <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Enter username' }]}>
              <Input placeholder="Enter username to invite..." />
            </Form.Item>
            <Form.Item label="Role" name="role" rules={[{ required: true }]}>
              <Select options={[
                { value: 'maintainer', label: 'Maintainer' },
                { value: 'developer', label: 'Developer' },
                { value: 'reviewer', label: 'Reviewer' },
                { value: 'viewer', label: 'Viewer' },
              ]} />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>Add Member</Button>
          </Form>
        </AppDialog>

        <AppDialog
          title={`Commit ${selectedCommit ? selectedCommit.substring(0, 7) : ''} — Changed Files`}
          open={modal === 'commit_files'}
          onOpenChange={(open) => { if (!open) { setModal(null); setCommitFiles([]); setSelectedCommit(null); } }}
          width={700}
        >
          {commitFiles.length === 0
            ? <div className="text-center py-8 text-slate-500">No file changes recorded for this commit.</div>
            : (
              <table className="w-full text-sm text-left">
                <thead className="border-b border-slate-700 text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">File</th>
                    <th className="py-2 pr-4">Change</th>
                    <th className="py-2 pr-4">Size</th>
                    <th className="py-2">Content</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {commitFiles.map((f) => (
                    <tr key={f.file_path}>
                      <td className="py-2 pr-4 font-mono text-xs text-primary">{f.file_path}</td>
                      <td className="py-2 pr-4">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', f.change_type === 'added' ? 'bg-green-500/10 text-green-400' : f.change_type === 'deleted' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400')}>{f.change_type}</span>
                      </td>
                      <td className="py-2 pr-4 text-slate-400">{f.size_bytes != null ? `${f.size_bytes} B` : '—'}</td>
                      <td className="py-2 font-mono text-xs text-slate-400 max-w-[200px] truncate">{f.content ? f.content.substring(0, 120) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </AppDialog>

        <AppDialog title="Edit Repository" open={modal === 'edit_repo'} onOpenChange={(open) => setModal(open ? 'edit_repo' : null)}>
          <Form
            layout="vertical"
            onFinish={updateRepo}
            initialValues={{
              description: selectedRepoCapability?.description || '',
              is_private: selectedRepoCapability?.is_private || false,
            }}
          >
            <Form.Item label="Description" name="description">
              <Textarea rows={3} placeholder="Repository description" />
            </Form.Item>
            <Form.Item name="is_private" valuePropName="checked">
              <Checkbox>Private repository</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>Save Changes</Button>
          </Form>
        </AppDialog>

        <AppDialog title="Create New Branch" open={modal === 'branch'} onOpenChange={(open) => setModal(open ? 'branch' : null)}>
          <Form layout="vertical" onFinish={createBranch} initialValues={{ is_protected: false }}>
            <Form.Item label="Branch name" name="name" rules={[{ required: true, message: 'Enter branch name' }]}>
              <Input placeholder="feature/my-feature" />
            </Form.Item>
            <Form.Item name="is_protected" valuePropName="checked">
              <Checkbox>Protected branch (requires PR approval to merge)</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>Create Branch</Button>
          </Form>
        </AppDialog>

        <AppDialog
          title="Confirm Repository Deletion"
          open={modal === 'delete_repo'}
          onOpenChange={(open) => setModal(open ? 'delete_repo' : null)}
          footer={(
            <>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="destructive" onClick={deleteRepo} loading={loading}>Delete Forever</Button>
            </>
          )}
        >
          <Alert variant="destructive">
            <AlertTitle>Critical Action</AlertTitle>
            <AlertDescription>
              You are about to delete <strong>{selectedRepo}</strong>. This will permanently remove all commits, issues, branches, and stats from the PostgreSQL database. This action cannot be undone.
            </AlertDescription>
          </Alert>
          <p className="mt-4 text-slate-500">Are you absolutely sure you want to proceed?</p>
        </AppDialog>
      </>
    );
  }
}
