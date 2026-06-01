import { Book, GitCommit, AlertCircle, GitPullRequest } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from 'recharts';

const repoChartConfig = {
  commit_count: { label: 'Commits', color: 'var(--chart-1)' },
  label: { color: 'var(--background)' },
};

const contributorChartConfig = {
  commit_count: { label: 'Commits', color: 'var(--chart-2)' },
  label: { color: 'var(--background)' },
};

export function AnalyticsScreen({ data }) {
  const analytics = data || {};
  const stats = [
    { label: 'Repositories', value: analytics.repo_count ?? 0, icon: Book },
    { label: 'Commits', value: analytics.commit_count ?? 0, icon: GitCommit },
    { label: 'Open Issues', value: analytics.open_issue_count ?? 0, icon: AlertCircle },
    { label: 'Merged PRs', value: analytics.merged_pr_count ?? 0, icon: GitPullRequest },
  ];

  const topRepos = (analytics.top_repositories || []).map((r) => ({
    name: r.name,
    commit_count: r.commit_count,
    health_score: r.health_score,
  }));

  const topContributors = (analytics.top_contributors || []).map((u) => ({
    name: u.username,
    commit_count: u.commit_count,
    repositories_touched: u.repositories_touched,
  }));

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
        {/* Top Repositories */}
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Top Repositories</CardTitle>
            <CardDescription>Most active projects by commit volume.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={repoChartConfig}>
              <BarChart
                data={topRepos}
                layout="vertical"
                margin={{ right: 48, left: 8 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} hide />
                <XAxis dataKey="commit_count" type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar dataKey="commit_count" fill="var(--color-commit_count)" radius={4}>
                  <LabelList
                    dataKey="name"
                    position="insideLeft"
                    offset={8}
                    style={{ fill: 'white' }}
                    fontSize={12}
                  />
                  <LabelList
                    dataKey="commit_count"
                    position="right"
                    offset={8}
                    style={{ fill: 'currentColor' }}
                    fontSize={12}
                    formatter={(v) => `${v} commits`}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Contributors */}
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Top Contributors</CardTitle>
            <CardDescription>Power users across the workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={contributorChartConfig}>
              <BarChart
                data={topContributors}
                layout="vertical"
                margin={{ right: 48, left: 8 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} hide />
                <XAxis dataKey="commit_count" type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar dataKey="commit_count" fill="var(--color-commit_count)" radius={4}>
                  <LabelList
                    dataKey="name"
                    position="insideLeft"
                    offset={8}
                    style={{ fill: 'white' }}
                    fontSize={12}
                  />
                  <LabelList
                    dataKey="commit_count"
                    position="right"
                    offset={8}
                    style={{ fill: 'currentColor' }}
                    fontSize={12}
                    formatter={(v) => `${v} commits`}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}