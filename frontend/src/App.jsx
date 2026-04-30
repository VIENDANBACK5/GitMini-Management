import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Book,
  Clock,
  GitBranch,
  GitCommit,
  GitPullRequest,
  LayoutDashboard,
  Lock,
  Plus,
  Search,
  User,
} from 'lucide-react';
import { api, demoUsers, login, logout } from './api.js';

function formatDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function formatMetadata(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) return '{}';
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(' · ');
}

function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{status}</span>;
}

function RoleBadge({ role }) {
  if (!role) return null;
  return <span className={`badge role-${role}`}>{role}</span>;
}

function EmptyState({ message }) {
  return <div className="empty-state glass">{message}</div>;
}

function mergeBlockedReason(reason) {
  if (reason === 'protected_branch_requires_approval') return 'protected branch requires reviewer approval';
  if (reason === 'insufficient_role') return 'merge requires owner/maintainer';
  if (reason === 'not_open') return 'pull request is not open';
  return 'merge is blocked';
}

const repoRoles = ['owner', 'maintainer', 'developer', 'reviewer', 'viewer'];

function canViewMembers(role) {
  return ['admin', 'owner', 'maintainer'].includes(role);
}

function canManageMembers(role) {
  return ['admin', 'owner'].includes(role);
}

function SectionHeader({ title, selectedRepo, children }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {selectedRepo ? <p>Repository: {selectedRepo}</p> : null}
      </div>
      <div className="section-actions">{children}</div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('repos');
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [data, setData] = useState([]);
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
  const selectedRepoCapability = selectedRepo ? repoCapabilities[selectedRepo] : null;
  const selectedRepoRole = selectedRepoCapability?.current_user_role;
  const mayViewMembers = canViewMembers(selectedRepoRole);
  const mayManageMembers = canManageMembers(selectedRepoRole);

  async function loadMembers(repo) {
    if (!repo) return;

    setMemberError('');
    try {
      setMembers(await api(`/repos/${encodeURIComponent(repo)}/members`));
    } catch (err) {
      setMembers([]);
      setMemberError(err.message);
    }
  }

  async function load(nextView = view, repo = selectedRepo) {
    setLoading(true);
    setError('');

    try {
      const currentMe = await api('/auth/me');
      setMe(currentMe);

      if (nextView === 'repos') {
        const repos = await api('/repos');
        setRepoCapabilities(Object.fromEntries(repos.map((item) => [item.name, item])));
        setData(repos);
      } else if (nextView === 'history') {
        const [repoDetail, history] = await Promise.all([
          api(`/repos/${encodeURIComponent(repo)}`),
          api(`/repos/${encodeURIComponent(repo)}/history`),
        ]);
        setRepoCapabilities((current) => ({ ...current, [repo]: repoDetail }));
        setData(history);
        if (canViewMembers(repoDetail.current_user_role)) {
          await loadMembers(repo);
        } else {
          setMembers([]);
          setMemberError('');
        }
      } else if (nextView === 'issues') {
        setData(await api('/issues'));
      } else if (nextView === 'pulls') {
        setData(await api('/pulls'));
      } else if (nextView === 'analytics') {
        setData(await api('/analytics'));
      } else if (nextView === 'audit') {
        setData(await api('/admin/audit-logs'));
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

  function resetAppState() {
    setSelectedRepo(null);
    setView('repos');
    setData([]);
    setMembers([]);
    setMemberError('');
    setRepoCapabilities({});
    setError('');
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const username = form.elements.username.value;
    const password = form.elements.password.value;

    setLoading(true);
    setLoginError('');
    try {
      setMe(await login(username, password));
      resetAppState();
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
    resetAppState();
  }

  function showSection(nextView) {
    setView(nextView);
  }

  function openRepo(repoName) {
    setSelectedRepo(repoName);
    setView('history');
  }

  async function handleSearch(event) {
    if (event.key !== 'Enter') return;

    const q = event.currentTarget.value.trim();
    if (!q) {
      load();
      return;
    }

    setLoading(true);
    setError('');
    setSearchTitle(`Search results for "${q}"`);
    setView('search');

    try {
      const path = selectedRepo
        ? `/repos/${encodeURIComponent(selectedRepo)}/search?q=${encodeURIComponent(q)}`
        : `/search?q=${encodeURIComponent(q)}`;
      setData(await api(path));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createRepo(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    if (!name) return;

    await api('/repos', 'POST', {
      name,
      description: form.elements.description.value.trim(),
      is_private: form.elements.isPrivate.checked,
    });
    setModal(null);
    setView('repos');
    await load('repos', selectedRepo);
  }

  async function createIssue(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const repo = form.elements.repo.value.trim();
    const title = form.elements.title.value.trim();
    if (!repo || !title) return;

    const labels = form.elements.labels.value
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean);

    await api(`/repos/${encodeURIComponent(repo)}/issues`, 'POST', {
      title,
      body: form.elements.body.value.trim(),
      labels,
    });
    setModal(null);
    setView('issues');
    await load('issues', selectedRepo);
  }

  async function createPull(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const repo = form.elements.repo.value.trim();
    const title = form.elements.title.value.trim();
    const source = form.elements.source.value.trim();
    const target = form.elements.target.value.trim();
    if (!repo || !title || !source || !target) return;

    await api(`/repos/${encodeURIComponent(repo)}/pulls`, 'POST', {
      title,
      body: form.elements.body.value.trim(),
      source_branch: source,
      target_branch: target,
    });
    setModal(null);
    setView('pulls');
    await load('pulls', selectedRepo);
  }

  async function updateIssue(issueId, status) {
    await api(`/issues/${encodeURIComponent(issueId)}`, 'PATCH', { status });
    await load('issues', selectedRepo);
  }

  async function updatePull(pullId, status) {
    await api(`/pulls/${encodeURIComponent(pullId)}`, 'PATCH', { status });
    await load('pulls', selectedRepo);
  }

  async function approvePull(pullId) {
    await api(`/pulls/${encodeURIComponent(pullId)}/reviews`, 'POST', { status: 'approved' });
    await load('pulls', selectedRepo);
  }

  async function addMember(event) {
    event.preventDefault();
    if (!selectedRepo || !mayManageMembers) return;

    const form = event.currentTarget;
    const username = form.elements.username.value.trim();
    const role = form.elements.role.value;
    if (!username) return;

    try {
      setMemberError('');
      await api(`/repos/${encodeURIComponent(selectedRepo)}/members`, 'POST', { username, role });
      form.reset();
      await loadMembers(selectedRepo);
    } catch (err) {
      setMemberError(err.message);
    }
  }

  async function updateMember(username, role) {
    if (!selectedRepo || !mayManageMembers) return;

    try {
      setMemberError('');
      await api(`/repos/${encodeURIComponent(selectedRepo)}/members/${encodeURIComponent(username)}`, 'PATCH', { role });
      await loadMembers(selectedRepo);
    } catch (err) {
      setMemberError(err.message);
    }
  }

  async function removeMember(username) {
    if (!selectedRepo || !mayManageMembers) return;

    try {
      setMemberError('');
      await api(`/repos/${encodeURIComponent(selectedRepo)}/members/${encodeURIComponent(username)}`, 'DELETE');
      await loadMembers(selectedRepo);
    } catch (err) {
      setMemberError(err.message);
    }
  }

  function openIssueModal() {
    if (selectedRepoCapability && !selectedRepoCapability.can_create_issue) return;
    setModal('issue');
  }

  function openPullModal() {
    if (selectedRepoCapability && !selectedRepoCapability.can_create_pull) return;
    setModal('pull');
  }

  if (!authChecked) {
    return <div className="app-container"><div className="loading">Checking session...</div></div>;
  }

  if (!me) {
    return renderLogin();
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo">
          <GitBranch />
          <div className="logo-copy">
            <span>GitMini</span>
            <small>SQL-first SCM</small>
          </div>
        </div>
        <nav>
          <button className={`nav-item ${view === 'repos' || view === 'history' || view === 'search' ? 'active' : ''}`} onClick={() => showSection('repos')}>
            <LayoutDashboard />
            <span>Repositories</span>
          </button>
          <button className={`nav-item ${view === 'issues' ? 'active' : ''}`} onClick={() => showSection('issues')}>
            <AlertCircle />
            <span>Global Issues</span>
          </button>
          <button className={`nav-item ${view === 'pulls' ? 'active' : ''}`} onClick={() => showSection('pulls')}>
            <GitPullRequest />
            <span>Pull Requests</span>
          </button>
          <button className={`nav-item ${view === 'analytics' ? 'active' : ''}`} onClick={() => showSection('analytics')}>
            <BarChart3 />
            <span>Analytics</span>
          </button>
          {me.system_role === 'admin' ? (
            <button className={`nav-item ${view === 'audit' ? 'active' : ''}`} onClick={() => showSection('audit')}>
              <Lock />
              <span>Audit Logs</span>
            </button>
          ) : null}
        </nav>
        <div className="user-profile">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${me.username}`} alt="avatar" />
          <div className="user-info">
            <span className="username">{me.username}</span>
            <span className="status">{me.system_role || 'user'}</span>
          </div>
          <button className="btn-secondary logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="search-container">
            <Search />
            <input type="text" placeholder="Search commits/issues (GIN Index)..." onKeyUp={handleSearch} />
          </div>
          <div className="actions">
            <span className="demo-pill">PostgreSQL + FastAPI + React</span>
            <button className="btn-primary" onClick={() => setModal('repo')}>
              <Plus /> New Repo
            </button>
          </div>
        </header>

        <section id="content-area">
          {loading ? <div className="loading">Fetching data from SQL...</div> : null}
          {error ? <div className="error">Error: {error}</div> : null}
          {!loading && !error ? renderContent() : null}
        </section>
      </main>

      {modal === 'repo' ? (
        <Modal title="Create New Repository" onClose={() => setModal(null)}>
          <form className="form-stack" onSubmit={createRepo}>
            <input name="name" type="text" placeholder="Repository name" />
            <textarea name="description" placeholder="Description" />
            <label className="checkbox-row">
              <input name="isPrivate" type="checkbox" />
              Private repository
            </label>
            <button className="btn-primary" type="submit">Create Now</button>
          </form>
        </Modal>
      ) : null}

      {modal === 'issue' ? (
        <Modal title="Create Issue" onClose={() => setModal(null)}>
          {selectedRepoCapability && !selectedRepoCapability.can_create_issue ? <p className="disabled-hint">Current role cannot create issues in this repository.</p> : null}
          <form className="form-stack" onSubmit={createIssue}>
            <input name="repo" type="text" placeholder="Repository name" defaultValue={selectedRepo || ''} />
            <input name="title" type="text" placeholder="Issue title" />
            <textarea name="body" placeholder="Description" />
            <input name="labels" type="text" placeholder="Labels, comma separated" />
            <button className="btn-primary" type="submit">Create Issue</button>
          </form>
        </Modal>
      ) : null}

      {modal === 'pull' ? (
        <Modal title="Create Pull Request" onClose={() => setModal(null)}>
          {selectedRepoCapability && !selectedRepoCapability.can_create_pull ? <p className="disabled-hint">Current role cannot create pull requests in this repository.</p> : null}
          <form className="form-stack" onSubmit={createPull}>
            <input name="repo" type="text" placeholder="Repository name" defaultValue={selectedRepo || ''} />
            <input name="title" type="text" placeholder="Pull request title" />
            <input name="source" type="text" placeholder="Source branch" defaultValue="feature/demo" />
            <input name="target" type="text" placeholder="Target branch" defaultValue="main" />
            <textarea name="body" placeholder="Description" />
            <button className="btn-primary" type="submit">Create Pull Request</button>
          </form>
        </Modal>
      ) : null}
    </div>
  );

  function renderLogin() {
    return (
      <div className="login-shell">
        <div className="login-card glass">
          <div className="logo login-logo">
            <GitBranch />
            <div className="logo-copy">
              <span>GitMini</span>
              <small>SQL-first SCM</small>
            </div>
          </div>
          <h1>Sign in to GitMini</h1>
          <p>Use a demo account to continue. Sessions are stored in an HttpOnly cookie.</p>
          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="login-username">Demo user</label>
            <select id="login-username" name="username" defaultValue="alice">
              {demoUsers.map((user) => (
                <option key={user.username} value={user.username}>{user.label} ({user.username}) — {user.description}</option>
              ))}
            </select>
            <label htmlFor="login-password">Password</label>
            <input id="login-password" name="password" type="password" placeholder="Password" />
            {loginError ? <div className="inline-error">{loginError}</div> : null}
            <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
          </form>
        </div>
      </div>
    );
  }

  function renderContent() {
    if (view === 'repos') {
      return data.length ? (
        <div className="repo-grid">
          {data.map((repo) => (
            <div className="card glass clickable" key={repo.id} onClick={() => openRepo(repo.name)}>
              <div className="card-title-row">
                <h3>{repo.name}</h3>
                <div className="badge-row">
                  <RoleBadge role={repo.current_user_role} />
                  <span className={`badge ${repo.is_private ? 'status-private' : 'status-public'}`}>{repo.is_private ? 'Private' : 'Public'}</span>
                </div>
              </div>
              <p>{repo.description || 'No description'}</p>
              <div className="meta">
                <span><Lock /> {repo.is_private ? 'Private' : 'Public'}</span>
                <span><GitCommit /> {repo.commit_count ?? 0} commits</span>
                <span><GitBranch /> {repo.branch_count ?? 0} branches</span>
                <span><AlertCircle /> {repo.issue_open_count ?? 0} open issues</span>
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState message="No repositories visible for this user." />;
    }

    if (view === 'history') {
      return (
        <div className="history-list">
          <SectionHeader title={`History for ${selectedRepo}`} selectedRepo={selectedRepo}>
            {selectedRepoCapability ? <RoleBadge role={selectedRepoCapability.current_user_role} /> : null}
            <button className="btn-secondary" onClick={() => setView('repos')}><ArrowLeft /> Back</button>
          </SectionHeader>
          {renderMembers()}
          {data.length ? data.map((item) => (
            <div className="history-item" key={item.hash}>
              <div className="commit-card glass card">
                <code>{(item.hash || '').substring(0, 7)}</code>
                <p>{item.message}</p>
                <span>{item.author || 'unknown'} · {formatDate(item.date)}</span>
              </div>
            </div>
          )) : <EmptyState message="No commits found for this repository." />}
        </div>
      );
    }

    if (view === 'issues') {
      return (
        <div className="content-section">
          <SectionHeader title="Global Issues Tracker" selectedRepo={selectedRepo}>
            <button
              className="btn-primary"
              disabled={Boolean(selectedRepoCapability && !selectedRepoCapability.can_create_issue)}
              onClick={openIssueModal}
            >
              <Plus /> New Issue
            </button>
          </SectionHeader>
          {selectedRepoCapability && !selectedRepoCapability.can_create_issue ? <p className="disabled-hint">Your current repo role is read-only for issue creation.</p> : null}
          {data.length ? (
            <div className="repo-grid compact-grid">
              {data.map((issue) => (
                <div className="card glass" key={issue.id}>
                  <div className="card-title-row">
                    <h4>#{issue.id} {issue.title}</h4>
                    <div className="badge-row">
                      <RoleBadge role={issue.current_user_role} />
                      <StatusBadge status={issue.status} />
                    </div>
                  </div>
                  <p>{issue.body || 'No description'}</p>
                  <div className="meta">
                    <span><Book /> {issue.repo}</span>
                    <span><User /> {issue.author || 'unknown'}</span>
                    <span><Clock /> {formatDate(issue.created_at)}</span>
                  </div>
                  <div className="card-actions">
                    <button
                      className="btn-secondary"
                      disabled={!issue.can_update}
                      onClick={() => updateIssue(issue.id, issue.status === 'closed' ? 'open' : 'closed')}
                    >
                      {issue.status === 'closed' ? 'Reopen' : 'Close'}
                    </button>
                    {!issue.can_update ? <span className="disabled-hint">read-only role</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState message="No issues found." />}
        </div>
      );
    }

    if (view === 'pulls') {
      return (
        <div className="content-section">
          <SectionHeader title="Pull Requests" selectedRepo={selectedRepo}>
            <button
              className="btn-primary"
              disabled={Boolean(selectedRepoCapability && !selectedRepoCapability.can_create_pull)}
              onClick={openPullModal}
            >
              <GitPullRequest /> New Pull Request
            </button>
          </SectionHeader>
          {selectedRepoCapability && !selectedRepoCapability.can_create_pull ? <p className="disabled-hint">Your current repo role cannot create pull requests.</p> : null}
          {data.length ? (
            <div className="repo-grid compact-grid">
              {data.map((pull) => (
                <div className="card glass" key={pull.id}>
                  <div className="card-title-row">
                    <h4>{pull.title}</h4>
                    <div className="badge-row">
                      <RoleBadge role={pull.current_user_role} />
                      <StatusBadge status={pull.status} />
                      {pull.target_branch_protected ? <span className="badge status-private">Protected</span> : null}
                      {pull.is_approved ? <span className="badge status-open">Approved</span> : null}
                    </div>
                  </div>
                  <p>{pull.body || 'No description'}</p>
                  <div className="meta">
                    <span><Book /> {pull.repo}</span>
                    <span><GitBranch /> {pull.source_branch} → {pull.target_branch}</span>
                    <span><User /> {pull.author || 'unknown'}</span>
                    <span><Lock /> {pull.approval_count ?? 0} approval{pull.approval_count === 1 ? '' : 's'}</span>
                    <span><Clock /> {formatDate(pull.updated_at || pull.created_at)}</span>
                  </div>
                  {pull.status === 'open' ? (
                    <div className="card-actions">
                      <button className="btn-secondary" disabled={!pull.can_update} onClick={() => updatePull(pull.id, 'closed')}>Close</button>
                      {pull.author !== me.username ? <button className="btn-secondary" onClick={() => approvePull(pull.id)}>Approve</button> : null}
                      <button className="btn-primary" disabled={!pull.can_merge} onClick={() => updatePull(pull.id, 'merged')}>Merge</button>
                      {!pull.can_merge ? <span className="disabled-hint">{mergeBlockedReason(pull.merge_blocked_reason)}</span> : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : <EmptyState message="No pull requests found. Create one to demonstrate the PR workflow." />}
        </div>
      );
    }

    if (view === 'analytics') {
      const analytics = data || {};
      const metrics = [
        ['Repositories', analytics.repo_count ?? 0],
        ['Commits', analytics.commit_count ?? 0],
        ['Open Issues', analytics.open_issue_count ?? 0],
        ['Merged PRs', analytics.merged_pr_count ?? 0],
      ];
      return (
        <div className="content-section">
          <SectionHeader title="Repository Analytics" selectedRepo={analytics.scope === 'global' ? 'Admin global scope' : 'Visible repositories only'} />
          <div className="repo-grid compact-grid">
            {metrics.map(([label, value]) => (
              <div className="card glass" key={label}>
                <div className="metric-value">{value}</div>
                <div className="metric-label">{label}</div>
              </div>
            ))}
          </div>
          <div className="repo-grid compact-grid analytics-grid">
            <div className="card glass">
              <h3>Top repositories</h3>
              {(analytics.top_repositories || []).map((repo) => (
                <div className="analytics-row" key={repo.name}>
                  <span>{repo.name}</span>
                  <span>{repo.commit_count} commits · health {repo.health_score}</span>
                </div>
              ))}
            </div>
            <div className="card glass">
              <h3>Top contributors</h3>
              {(analytics.top_contributors || []).map((user) => (
                <div className="analytics-row" key={user.username}>
                  <span>{user.username}</span>
                  <span>{user.commit_count} commits · {user.repositories_touched} repos</span>
                </div>
              ))}
            </div>
            <div className="card glass">
              <h3>Recent activity</h3>
              {(analytics.recent_activity || []).map((item) => (
                <div className="analytics-row" key={`${item.type}-${item.id}`}>
                  <span><span className="badge">{item.type}</span> {item.title}</span>
                  <span>{item.repo} · {formatDate(item.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (view === 'audit') {
      return (
        <div className="content-section">
          <SectionHeader title="Audit Logs" selectedRepo="Admin-only accountability trail" />
          {data.length ? (
            <div className="card glass">
              {data.map((entry) => (
                <div className="analytics-row audit-row" key={entry.id}>
                  <span>
                    <span className="badge">{entry.action}</span> {entry.actor || 'deleted user'} → {entry.target_type} {entry.target_id || ''}
                    <small>{formatMetadata(entry.metadata)}</small>
                  </span>
                  <span>{entry.repo || 'system'} · {formatDate(entry.created_at)}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState message="No audit logs found yet." />}
        </div>
      );
    }

    if (view === 'search') {
      return (
        <div className="content-section">
          <SectionHeader title={searchTitle} selectedRepo={selectedRepo} />
          {data.length ? (
            <div className="repo-grid compact-grid">
              {data.map((result, index) => (
                <div className="card glass" key={`${result.type}-${result.id}-${index}`}>
                  <div className="card-title-row">
                    <h4>{result.title || result.message || result.hash || result.id}</h4>
                    <span className="badge">{result.type}</span>
                  </div>
                  <p>{result.body || result.message || 'No description'}</p>
                  <div className="meta">
                    <span><Book /> {result.repo}</span>
                    {result.type === 'commit'
                      ? <span><GitCommit /> {(result.hash || result.id || '').substring(0, 7)}</span>
                      : <StatusBadge status={result.status} />}
                    <span><Clock /> {formatDate(result.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState message="No matching issues or commits found." />}
        </div>
      );
    }

    return null;
  }

  function renderMembers() {
    if (!selectedRepoCapability) return null;

    if (!mayViewMembers) {
      return (
        <div className="members-panel glass">
          <div className="card-title-row">
            <h3>Repository members</h3>
            <RoleBadge role={selectedRepoRole} />
          </div>
          <p className="disabled-hint">Only admin, owner or maintainer can view repository members.</p>
        </div>
      );
    }

    return (
      <div className="members-panel glass">
        <div className="card-title-row">
          <div>
            <h3>Repository members</h3>
            <p>{mayManageMembers ? 'Owner/admin can add, change roles and remove members.' : 'Maintainer can view members only.'}</p>
          </div>
          <RoleBadge role={selectedRepoRole} />
        </div>

        {memberError ? <div className="inline-error">{memberError}</div> : null}

        {mayManageMembers ? (
          <form className="member-form" onSubmit={addMember}>
            <input name="username" type="text" placeholder="Username" />
            <select name="role" defaultValue="viewer">
              {repoRoles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <button className="btn-primary" type="submit"><Plus /> Add member</button>
          </form>
        ) : <p className="disabled-hint">Only owner/admin can manage roles.</p>}

        {members.length ? (
          <div className="member-list">
            {members.map((member) => (
              <div className="member-row" key={member.username}>
                <div>
                  <strong>{member.username}</strong>
                  <span>{member.full_name || 'No full name'} · joined {formatDate(member.joined_at)}</span>
                </div>
                <div className="member-actions">
                  {mayManageMembers ? (
                    <select value={member.role} onChange={(event) => updateMember(member.username, event.target.value)}>
                      {repoRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  ) : <RoleBadge role={member.role} />}
                  <button className="btn-secondary" disabled={!mayManageMembers} onClick={() => removeMember(member.username)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="disabled-hint">No members found.</p>}
      </div>
    );
  }
}
