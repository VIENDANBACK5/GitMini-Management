import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Dropdown,
  Empty,
  Form,
  Input,
  Layout,
  List,
  Menu,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Book,
  Clock,
  Database,
  GitBranch,
  GitCommit,
  GitPullRequest,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';
import { api, demoUsers, login, logout } from './api.js';

const { Header, Sider, Content } = Layout;
const { Text, Title, Paragraph } = Typography;
const { TextArea, Password, Search: SearchInput } = Input;

const repoRoles = ['owner', 'maintainer', 'developer', 'reviewer', 'viewer'];

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

function mergeBlockedReason(reason) {
  if (reason === 'protected_branch_requires_approval') return 'Protected branch requires reviewer approval';
  if (reason === 'insufficient_role') return 'Merge requires owner or maintainer';
  if (reason === 'not_open') return 'Pull request is not open';
  return 'Merge is blocked';
}

function canViewMembers(role) {
  return ['admin', 'owner', 'maintainer'].includes(role);
}

function canManageMembers(role) {
  return ['admin', 'owner'].includes(role);
}

function statusColor(status) {
  if (status === 'open' || status === 'success') return 'green';
  if (status === 'closed' || status === 'failed') return 'red';
  if (status === 'merged' || status === 'approved') return 'purple';
  if (status === 'running' || status === 'queued') return 'blue';
  return 'default';
}

function roleColor(role) {
  if (role === 'admin' || role === 'owner') return 'gold';
  if (role === 'maintainer') return 'cyan';
  if (role === 'developer') return 'blue';
  if (role === 'reviewer') return 'purple';
  if (role === 'viewer') return 'default';
  return 'default';
}

function StatusTag({ status }) {
  return status ? <Tag color={statusColor(status)}>{status}</Tag> : null;
}

function RoleTag({ role }) {
  return role ? <Tag color={roleColor(role)}>{role}</Tag> : null;
}

function Icon({ children }) {
  return <span className="menu-icon">{children}</span>;
}

function SectionHeader({ title, subtitle, selectedRepo, children }) {
  return (
    <div className="section-header">
      <div>
        <Title level={2}>{title}</Title>
        <Text type="secondary">{selectedRepo ? `Repository: ${selectedRepo}` : subtitle}</Text>
      </div>
      {children ? <Space wrap>{children}</Space> : null}
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
  const [memberForm] = Form.useForm();
  const selectedRepoCapability = selectedRepo ? repoCapabilities[selectedRepo] : null;
  const selectedRepoRole = selectedRepoCapability?.current_user_role;
  const mayViewMembers = canViewMembers(selectedRepoRole);
  const mayManageMembers = canManageMembers(selectedRepoRole);

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

  async function load(nextView = view, repo = selectedRepo) {
    setLoading(true);
    setError('');
    setData([]); // Ensure data is reset to empty array to avoid crashes
    setMembers([]); // Also clear members for safety

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

  async function handleLogin(values) {
    setLoading(true);
    setLoginError('');
    try {
      setMe(await login(values.username, values.password || ''));
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

  async function handleSearch(value) {
    const q = value.trim();
    if (!q) {
      setView('repos');
      load('repos');
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

  async function createRepo(values) {
    if (!values.name?.trim()) return;

    setLoading(true);
    setError('');
    try {
      await api('/repos', 'POST', {
        name: values.name.trim(),
        description: values.description?.trim() || '',
        is_private: Boolean(values.isPrivate),
      });
      setModal(null);
      setView('repos');
      await load('repos', selectedRepo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRepo() {
    if (!selectedRepo) return;
    
    setLoading(true);
    setError('');
    try {
      await api(`/repos/${encodeURIComponent(selectedRepo)}`, 'DELETE');
      setModal(null);
      setSelectedRepo(null);
      setView('repos');
      await load('repos');
    } catch (err) {
      setError(err.message);
      setModal(null);
    } finally {
      setLoading(false);
    }
  }

  async function createIssue(values) {
    const repo = values.repo?.trim();
    const title = values.title?.trim();
    if (!repo || !title) return;

    setLoading(true);
    setError('');
    try {
      const labels = (values.labels || '')
        .split(',')
        .map((label) => label.trim())
        .filter(Boolean);

      await api(`/repos/${encodeURIComponent(repo)}/issues`, 'POST', {
        title,
        body: values.body?.trim() || '',
        labels,
      });
      setModal(null);
      setView('issues');
      await load('issues', selectedRepo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createPull(values) {
    const repo = values.repo?.trim();
    const title = values.title?.trim();
    const source = values.source?.trim();
    const target = values.target?.trim();
    if (!repo || !title || !source || !target) return;

    setLoading(true);
    setError('');
    try {
      await api(`/repos/${encodeURIComponent(repo)}/pulls`, 'POST', {
        title,
        body: values.body?.trim() || '',
        source_branch: source,
        target_branch: target,
      });
      setModal(null);
      setView('pulls');
      await load('pulls', selectedRepo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  async function addMember(values) {
    if (!selectedRepo || !mayManageMembers) return;

    const username = values.username?.trim();
    if (!username) return;

    try {
      setMemberError('');
      await api(`/repos/${encodeURIComponent(selectedRepo)}/members`, 'POST', { username, role: values.role });
      memberForm.resetFields();
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

    const safeMembers = Array.isArray(members) ? members : [];
    const ownerCount = safeMembers.filter((m) => m.role === 'owner').length;
    const target = safeMembers.find((m) => m.username === username);
    if (target?.role === 'owner' && ownerCount <= 1) {
      setMemberError('Repository must keep at least one owner');
      return;
    }

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
    return (
      <div className="login-shell">
        <Spin size="large" tip="Checking session..." />
      </div>
    );
  }

  if (!me) {
    return renderLogin();
  }

  const menuItems = [
    { key: 'repos', icon: <Icon><LayoutDashboard size={18} /></Icon>, label: 'Repositories' },
    { key: 'issues', icon: <Icon><AlertCircle size={18} /></Icon>, label: 'Global Issues' },
    { key: 'pulls', icon: <Icon><GitPullRequest size={18} /></Icon>, label: 'Pull Requests' },
    { key: 'analytics', icon: <Icon><BarChart3 size={18} /></Icon>, label: 'Analytics' },
    me.system_role === 'admin'
      ? { key: 'audit', icon: <Icon><Lock size={18} /></Icon>, label: 'Audit Logs' }
      : null,
  ].filter(Boolean);

  const selectedMenuKey = ['history', 'search'].includes(view) ? 'repos' : view;

  return (
    <Layout className="app-shell">
      <Sider width={280} breakpoint="lg" collapsedWidth="0" className="app-sider">
        <div className="brand-block">
          <div className="brand-mark"><GitBranch size={24} /></div>
          <div>
            <Title level={4}>GitMini</Title>
            <Text type="secondary">SQL-first SCM</Text>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          items={menuItems}
          onClick={({ key }) => showSection(key)}
          className="app-menu"
        />

        <Card className="operator-card" size="small">
          <Space align="center">
            <Avatar>{me.username.slice(0, 1).toUpperCase()}</Avatar>
            <div className="operator-info">
              <Text strong>{me.username}</Text>
              <RoleTag role={me.system_role || 'user'} />
            </div>
          </Space>
          <Button block icon={<LogOut size={16} />} onClick={handleLogout}>Logout</Button>
        </Card>
      </Sider>

      <Layout className="workspace">
        <Header className="top-header">
          <SearchInput
            allowClear
            size="large"
            prefix={<Search size={16} />}
            placeholder="Search commits/issues with PostgreSQL GIN index..."
            onSearch={handleSearch}
            className="global-search"
          />
          <Space wrap className="top-actions">
            <Tag color="blue" icon={<Database size={14} />}>PostgreSQL 20 tables</Tag>
            <Button type="primary" icon={<Plus size={16} />} onClick={() => setModal('repo')}>New Repo</Button>
          </Space>
        </Header>

        <Content className="content-shell">
          {loading ? <Card><Spin tip="Fetching data from SQL..." /></Card> : null}
          {error ? <Alert type="error" showIcon message="Request failed" description={error} className="content-alert" /> : null}
          {!loading && !error ? renderContent() : null}
        </Content>
      </Layout>

      {renderModals()}
    </Layout>
  );

  function renderLogin() {
    return (
      <div className="login-shell">
        <Card className="login-card">
          <div className="login-brand">
            <div className="brand-mark"><GitBranch size={28} /></div>
            <div>
              <Title level={2}>GitMini Console</Title>
              <Text type="secondary">Professional database administration demo</Text>
            </div>
          </div>
          <Paragraph type="secondary">
            Sign in with a demo account to manage repositories, permissions, pull requests, analytics and audit logs.
          </Paragraph>

          <Form layout="vertical" initialValues={{ username: 'alice' }} onFinish={handleLogin}>
            <Form.Item label="Demo user" name="username" rules={[{ required: true }]}>
              <Select
                options={demoUsers.map((user) => ({
                  value: user.username,
                  label: `${user.label} (${user.username}) — ${user.description}`,
                }))}
              />
            </Form.Item>
            <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Enter the demo password' }]}>
              <Password placeholder="gitmini_password" />
            </Form.Item>
            {loginError ? <Alert type="error" showIcon message={loginError} /> : null}
            <Button type="primary" htmlType="submit" loading={loading} block size="large">Sign in</Button>
          </Form>
        </Card>
      </div>
    );
  }

  function renderContent() {
    if (view === 'repos') return renderRepos();
    if (view === 'history') return renderHistory();
    if (view === 'issues') return renderIssues();
    if (view === 'pulls') return renderPulls();
    if (view === 'analytics') return renderAnalytics();
    if (view === 'audit') return renderAudit();
    if (view === 'search') return renderSearch();
    return null;
  }

  function renderRepos() {
    return (
      <div>
        <SectionHeader title="Repository Control Center" subtitle="Manage visible repositories, branches, commits and role-based access." />
        {Array.isArray(data) && data.length ? (
          <Row gutter={[18, 18]}>
            {data.map((repo) => (
              <Col xs={24} md={12} xl={8} key={repo.id}>
                <Card
                  hoverable
                  className="dashboard-card repo-card"
                  onClick={() => openRepo(repo.name)}
                  title={<Space><Book size={18} />{repo.name}</Space>}
                  extra={<Space><RoleTag role={repo.current_user_role} /><Tag color={repo.is_private ? 'red' : 'green'}>{repo.is_private ? 'Private' : 'Public'}</Tag></Space>}
                >
                  <Paragraph type="secondary" ellipsis={{ rows: 2 }}>{repo.description || 'No description'}</Paragraph>
                  <Row gutter={12}>
                    <Col span={8}><Statistic title="Commits" value={repo.commit_count ?? 0} /></Col>
                    <Col span={8}><Statistic title="Branches" value={repo.branch_count ?? 0} /></Col>
                    <Col span={8}><Statistic title="Open issues" value={repo.issue_open_count ?? 0} /></Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        ) : <Empty description="No repositories visible for this user." />}
      </div>
    );
  }

  function renderHistory() {
    return (
      <div>
        <SectionHeader title={`Commit History`} selectedRepo={selectedRepo}>
          {selectedRepoCapability ? <RoleTag role={selectedRepoCapability.current_user_role} /> : null}
          {(me.system_role === 'admin' || selectedRepoRole === 'owner') && (
            <Button danger onClick={() => setModal('delete_repo')}>Delete Repository</Button>
          )}
          <Button icon={<ArrowLeft size={16} />} onClick={() => setView('repos')}>Back</Button>
        </SectionHeader>
        {renderMembers()}
        {Array.isArray(data) && data.length ? (
          <Card className="dashboard-card">
            <Timeline
              items={data.map((item) => ({
                color: 'blue',
                children: (
                  <div className="timeline-commit">
                    <Tag color="geekblue">{(item.hash || '').substring(0, 7)}</Tag>
                    <Text strong>{item.message}</Text>
                    <Text type="secondary">{item.author || 'unknown'} · {formatDate(item.date)}</Text>
                  </div>
                ),
              }))}
            />
          </Card>
        ) : <Empty description="No commits found for this repository." />}
      </div>
    );
  }

  function renderIssues() {
    const columns = [
      { title: 'Issue', dataIndex: 'title', render: (title, issue) => <Space direction="vertical" size={0}><Text strong>#{issue.id} {title}</Text><Text type="secondary">{issue.body || 'No description'}</Text></Space> },
      { title: 'Repo', dataIndex: 'repo', render: (repo) => <Tag icon={<Book size={13} />}>{repo}</Tag> },
      { title: 'Author', dataIndex: 'author', render: (author) => author || 'unknown' },
      { title: 'Role', dataIndex: 'current_user_role', render: (role) => <RoleTag role={role} /> },
      { title: 'Status', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
      { title: 'Created', dataIndex: 'created_at', render: formatDate },
      {
        title: 'Action',
        render: (_, issue) => (
          <Tooltip title={!issue.can_update ? 'Read-only role' : ''}>
            <Button disabled={!issue.can_update} onClick={() => updateIssue(issue.id, issue.status === 'closed' ? 'open' : 'closed')}>
              {issue.status === 'closed' ? 'Reopen' : 'Close'}
            </Button>
          </Tooltip>
        ),
      },
    ];

    return (
      <div>
        <SectionHeader title="Global Issues Tracker" selectedRepo={selectedRepo}>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            disabled={Boolean(selectedRepoCapability && !selectedRepoCapability.can_create_issue)}
            onClick={openIssueModal}
          >
            New Issue
          </Button>
        </SectionHeader>
        {selectedRepoCapability && !selectedRepoCapability.can_create_issue ? <Alert type="warning" showIcon message="Your current repo role is read-only for issue creation." className="content-alert" /> : null}
        <Table rowKey="id" columns={columns} dataSource={Array.isArray(data) ? data : []} pagination={{ pageSize: 8 }} scroll={{ x: 980 }} />
      </div>
    );
  }

  function renderPulls() {
    const columns = [
      { title: 'Pull request', dataIndex: 'title', render: (title, pull) => <Space direction="vertical" size={0}><Text strong>{title}</Text><Text type="secondary">{pull.body || 'No description'}</Text></Space> },
      { title: 'Repo', dataIndex: 'repo', render: (repo) => <Tag>{repo}</Tag> },
      { title: 'Branches', render: (_, pull) => <Text>{pull.source_branch} → {pull.target_branch}</Text> },
      { title: 'Governance', render: (_, pull) => <Space wrap><RoleTag role={pull.current_user_role} /><StatusTag status={pull.status} />{pull.target_branch_protected ? <Tag color="red">Protected</Tag> : null}{pull.is_approved ? <Tag color="green">Approved</Tag> : null}<Tag>{pull.approval_count ?? 0} approval{pull.approval_count === 1 ? '' : 's'}</Tag></Space> },
      { title: 'Updated', render: (_, pull) => formatDate(pull.updated_at || pull.created_at) },
      {
        title: 'Actions',
        render: (_, pull) => pull.status === 'open' ? (
          <Space wrap>
            <Button disabled={!pull.can_update} onClick={() => updatePull(pull.id, 'closed')}>Close</Button>
            {pull.author !== me.username ? <Button onClick={() => approvePull(pull.id)}>Approve</Button> : null}
            <Tooltip title={!pull.can_merge ? mergeBlockedReason(pull.merge_blocked_reason) : ''}>
              <Button type="primary" disabled={!pull.can_merge} onClick={() => updatePull(pull.id, 'merged')}>Merge</Button>
            </Tooltip>
          </Space>
        ) : null,
      },
    ];

    return (
      <div>
        <SectionHeader title="Pull Request Governance" selectedRepo={selectedRepo}>
          <Button
            type="primary"
            icon={<GitPullRequest size={16} />}
            disabled={Boolean(selectedRepoCapability && !selectedRepoCapability.can_create_pull)}
            onClick={openPullModal}
          >
            New Pull Request
          </Button>
        </SectionHeader>
        {selectedRepoCapability && !selectedRepoCapability.can_create_pull ? <Alert type="warning" showIcon message="Your current repo role cannot create pull requests." className="content-alert" /> : null}
        <Table rowKey="id" columns={columns} dataSource={Array.isArray(data) ? data : []} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} />
      </div>
    );
  }

  function renderAnalytics() {
    const analytics = data || {};
    const metrics = [
      ['Repositories', analytics.repo_count ?? 0, <Database size={22} />],
      ['Commits', analytics.commit_count ?? 0, <GitCommit size={22} />],
      ['Open Issues', analytics.open_issue_count ?? 0, <AlertCircle size={22} />],
      ['Merged PRs', analytics.merged_pr_count ?? 0, <GitPullRequest size={22} />],
    ];

    return (
      <div>
        <SectionHeader title="Repository Analytics" selectedRepo={analytics.scope === 'global' ? 'Admin global scope' : 'Visible repositories only'} />
        <Row gutter={[18, 18]}>
          {metrics.map(([label, value, icon]) => (
            <Col xs={24} sm={12} xl={6} key={label}>
              <Card className="dashboard-card"><Statistic title={label} value={value} prefix={icon} /></Card>
            </Col>
          ))}
        </Row>
        <Row gutter={[18, 18]} className="analytics-panels">
          <Col xs={24} lg={8}>
            <Card title="Top repositories" className="dashboard-card">
              <List dataSource={analytics.top_repositories || []} renderItem={(repo) => <List.Item><Text>{repo.name}</Text><Text type="secondary">{repo.commit_count} commits · health {repo.health_score}</Text></List.Item>} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Top contributors" className="dashboard-card">
              <List dataSource={analytics.top_contributors || []} renderItem={(user) => <List.Item><Text>{user.username}</Text><Text type="secondary">{user.commit_count} commits · {user.repositories_touched} repos</Text></List.Item>} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Recent activity" className="dashboard-card">
              <List dataSource={analytics.recent_activity || []} renderItem={(item) => <List.Item><Space direction="vertical" size={0}><Text><Tag>{item.type}</Tag>{item.title}</Text><Text type="secondary">{item.repo} · {formatDate(item.created_at)}</Text></Space></List.Item>} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  function renderAudit() {
    const columns = [
      { title: 'Action', dataIndex: 'action', render: (action) => <Tag color="blue">{action}</Tag> },
      { title: 'Actor', dataIndex: 'actor', render: (actor) => actor || 'deleted user' },
      { title: 'Target', render: (_, entry) => `${entry.target_type} ${entry.target_id || ''}` },
      { title: 'Repository', dataIndex: 'repo', render: (repo) => repo || 'system' },
      { title: 'Metadata', dataIndex: 'metadata', render: (metadata) => <Text type="secondary">{formatMetadata(metadata)}</Text> },
      { title: 'Created', dataIndex: 'created_at', render: formatDate },
    ];

    return (
      <div>
        <SectionHeader title="Audit Logs" subtitle="Admin-only accountability trail for sensitive operations." />
        <Table rowKey="id" columns={columns} dataSource={Array.isArray(data) ? data : []} pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
      </div>
    );
  }

  function renderSearch() {
    return (
      <div>
        <SectionHeader title={searchTitle} selectedRepo={selectedRepo} />
        {Array.isArray(data) && data.length ? (
          <Row gutter={[18, 18]}>
            {data.map((result, index) => (
              <Col xs={24} md={12} xl={8} key={`${result.type}-${result.id}-${index}`}>
                <Card className="dashboard-card" title={result.title || result.message || result.hash || result.id} extra={<Tag>{result.type}</Tag>}>
                  <Paragraph type="secondary" ellipsis={{ rows: 3 }}>{result.body || result.message || 'No description'}</Paragraph>
                  <Space wrap>
                    <Tag icon={<Book size={13} />}>{result.repo}</Tag>
                    {result.type === 'commit'
                      ? <Tag icon={<GitCommit size={13} />}>{(result.hash || result.id || '').substring(0, 7)}</Tag>
                      : <StatusTag status={result.status} />}
                    <Tag icon={<Clock size={13} />}>{formatDate(result.created_at)}</Tag>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        ) : <Empty description="No matching issues or commits found." />}
      </div>
    );
  }

  function renderMembers() {
    if (!selectedRepoCapability) return null;

    if (!mayViewMembers) {
      return (
        <Alert
          type="warning"
          showIcon
          message="Repository members are restricted"
          description="Only admin, owner or maintainer can view repository members."
          className="content-alert"
        />
      );
    }

    const safeMembers = Array.isArray(members) ? members : [];
    const ownerCount = safeMembers.filter((m) => m.role === 'owner').length;

    const memberColumns = [
      { title: 'User', render: (_, member) => <Space direction="vertical" size={0}><Text strong>{member.username}</Text><Text type="secondary">{member.full_name || 'No full name'} · joined {formatDate(member.joined_at)}</Text></Space> },
      {
        title: 'Role',
        render: (_, member) => mayManageMembers ? (
          <Select value={member.role} onChange={(role) => updateMember(member.username, role)} options={repoRoles.map((role) => ({ value: role, label: role }))} />
        ) : <RoleTag role={member.role} />,
      },
      {
        title: 'Action',
        render: (_, member) => {
          const isLastOwner = member.role === 'owner' && ownerCount <= 1;
          return (
            <Tooltip title={isLastOwner ? 'Repository must keep at least one owner' : ''}>
              <Button
                danger
                disabled={!mayManageMembers || isLastOwner}
                onClick={() => removeMember(member.username)}
              >
                Remove
              </Button>
            </Tooltip>
          );
        },
      },
    ];

    return (
      <Card className="dashboard-card members-card" title={<Space><ShieldCheck size={18} />Repository members</Space>} extra={<RoleTag role={selectedRepoRole} />}>
        <Paragraph type="secondary">
          {mayManageMembers ? 'Owner/admin can add, change roles and remove members.' : 'Maintainer can view members only.'}
        </Paragraph>
        {memberError ? <Alert type="error" showIcon message={memberError} className="content-alert" /> : null}
        {mayManageMembers ? (
          <Form form={memberForm} layout="inline" initialValues={{ role: 'viewer' }} onFinish={addMember} className="member-form">
            <Form.Item name="username" rules={[{ required: true, message: 'Enter username' }]}>
              <Input placeholder="Username" />
            </Form.Item>
            <Form.Item name="role">
              <Select style={{ width: 150 }} options={repoRoles.map((role) => ({ value: role, label: role }))} />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<Plus size={16} />}>Add member</Button>
          </Form>
        ) : <Alert type="info" showIcon message="Only owner/admin can manage roles." className="content-alert" />}
        <Table rowKey="username" columns={memberColumns} dataSource={safeMembers} pagination={false} locale={{ emptyText: 'No members found.' }} />
      </Card>
    );
  }

  function renderModals() {
    return (
      <>
        <Modal title="Create New Repository" open={modal === 'repo'} onCancel={() => setModal(null)} footer={null} destroyOnClose>
          <Form layout="vertical" onFinish={createRepo} initialValues={{ isPrivate: false }}>
            <Form.Item label="Repository name" name="name" rules={[{ required: true, message: 'Enter repository name' }]}>
              <Input placeholder="Repository name" />
            </Form.Item>
            <Form.Item label="Description" name="description">
              <TextArea rows={3} placeholder="Description" />
            </Form.Item>
            <Form.Item name="isPrivate" valuePropName="checked">
              <Checkbox>Private repository</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" block>Create Now</Button>
          </Form>
        </Modal>

        <Modal title="Create Issue" open={modal === 'issue'} onCancel={() => setModal(null)} footer={null} destroyOnClose>
          {selectedRepoCapability && !selectedRepoCapability.can_create_issue ? <Alert type="warning" showIcon message="Current role cannot create issues in this repository." className="content-alert" /> : null}
          <Form layout="vertical" onFinish={createIssue} initialValues={{ repo: selectedRepo || '' }}>
            <Form.Item label="Repository" name="repo" rules={[{ required: true, message: 'Enter repository name' }]}>
              <Input placeholder="Repository name" />
            </Form.Item>
            <Form.Item label="Issue title" name="title" rules={[{ required: true, message: 'Enter issue title' }]}>
              <Input placeholder="Issue title" />
            </Form.Item>
            <Form.Item label="Description" name="body">
              <TextArea rows={4} placeholder="Description" />
            </Form.Item>
            <Form.Item label="Labels" name="labels">
              <Input placeholder="backend, database, security" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>Create Issue</Button>
          </Form>
        </Modal>

        <Modal title="Create Pull Request" open={modal === 'pull'} onCancel={() => setModal(null)} footer={null} destroyOnClose>
          {selectedRepoCapability && !selectedRepoCapability.can_create_pull ? <Alert type="warning" showIcon message="Current role cannot create pull requests in this repository." className="content-alert" /> : null}
          <Form layout="vertical" onFinish={createPull} initialValues={{ repo: selectedRepo || '', source: 'feature/demo', target: 'main' }}>
            <Form.Item label="Repository" name="repo" rules={[{ required: true, message: 'Enter repository name' }]}>
              <Input placeholder="Repository name" />
            </Form.Item>
            <Form.Item label="Pull request title" name="title" rules={[{ required: true, message: 'Enter pull request title' }]}>
              <Input placeholder="Pull request title" />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Source branch" name="source" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Target branch" name="target" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Description" name="body">
              <TextArea rows={4} placeholder="Description" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>Create Pull Request</Button>
          </Form>
        </Modal>

        <Modal title="Confirm Repository Deletion" open={modal === 'delete_repo'} onCancel={() => setModal(null)} onOk={deleteRepo} okText="Delete Forever" okButtonProps={{ danger: true }} confirmLoading={loading}>
          <Alert
            type="error"
            showIcon
            message="Critical Action"
            description={
              <span>
                You are about to delete <strong>{selectedRepo}</strong>. This will permanently remove all commits, issues, branches, and stats from the PostgreSQL database. This action cannot be undone.
              </span>
            }
          />
          <Paragraph style={{ marginTop: 16 }}>Are you absolutely sure you want to proceed?</Paragraph>
        </Modal>
      </>
    );
  }
}
