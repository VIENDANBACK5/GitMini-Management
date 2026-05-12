import { Book, GitCommit, AlertCircle, GitPullRequest } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function AnalyticsScreen({ data }) {
  const analytics = data || {};
  const stats = [
    { label: 'Repositories', value: analytics.repo_count ?? 0, icon: Book },
    { label: 'Commits', value: analytics.commit_count ?? 0, icon: GitCommit },
    { label: 'Open Issues', value: analytics.open_issue_count ?? 0, icon: AlertCircle },
    { label: 'Merged PRs', value: analytics.merged_pr_count ?? 0, icon: GitPullRequest },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">System Analytics</h2>
        <p className="text-slate-400">High-level overview of workspace health and activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-slate-900/40 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-400">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">Live from PostgreSQL</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Top Repositories</CardTitle>
            <CardDescription>Most active projects by commit volume.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics.top_repositories || []).map((repo) => (
                <div key={repo.name} className="flex items-center justify-between group">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">{repo.name}</p>
                    <p className="text-xs text-slate-500">Health Score: {repo.health_score}%</p>
                  </div>
                  <div className="text-sm font-semibold">{repo.commit_count} commits</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Top Contributors</CardTitle>
            <CardDescription>Power users across the workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics.top_contributors || []).map((user) => (
                <div key={user.username} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                      {user.username.substring(0, 2)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs text-slate-500">{user.repositories_touched} repositories</p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{user.commit_count} commits</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
