import { Book, GitCommit, AlertCircle, GitPullRequest } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from 'recharts';

const repoChartConfig = {
  commit_count: { label: 'Commits', color: 'hsl(var(--primary))' },
  label: { color: 'var(--background)' },
};

const contributorChartConfig = {
  commit_count: { label: 'Commits', color: 'hsl(280, 80%, 65%)' },
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
    <div className="space-y-8 max-w-6xl mx-auto animate-slide-up relative z-10">
      <div className="space-y-1">
        <h2 className="text-4xl font-extrabold tracking-tight text-gradient">System Analytics</h2>
        <p className="text-slate-400 text-sm">High-level overview of workspace health and activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div 
            key={stat.label} 
            className="glass-card glass-card-hover elastic-transition p-6 flex flex-col justify-between h-32"
            style={{ animationDelay: `${i * 35}ms` }}
          >
            <div className="flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-purple-400/80" />
            </div>
            <div className="mt-auto">
              <div className="text-3xl font-black text-slate-100 tracking-tight">{stat.value}</div>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-wider">Live from PostgreSQL</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Repositories */}
        <div className="glass-card border border-purple-500/10 p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-200">Top Repositories</h3>
            <p className="text-xs text-slate-400 mt-1">Most active projects by commit volume.</p>
          </div>
          <div>
            <ChartContainer config={repoChartConfig}>
              <BarChart
                data={topRepos}
                layout="vertical"
                margin={{ right: 48, left: 8 }}
              >
                <CartesianGrid horizontal={false} stroke="rgba(168, 85, 247, 0.05)" />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} hide />
                <XAxis dataKey="commit_count" type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar dataKey="commit_count" fill="hsl(var(--primary))" radius={6}>
                  <LabelList
                    dataKey="name"
                    position="insideLeft"
                    offset={8}
                    style={{ fill: 'white', fontWeight: 600 }}
                    fontSize={11}
                  />
                  <LabelList
                    dataKey="commit_count"
                    position="right"
                    offset={8}
                    style={{ fill: '#d8b4fe', fontWeight: 700 }}
                    fontSize={11}
                    formatter={(v) => `${v} commits`}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        {/* Top Contributors */}
        <div className="glass-card border border-purple-500/10 p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-200">Top Contributors</h3>
            <p className="text-xs text-slate-400 mt-1">Power users across the workspace.</p>
          </div>
          <div>
            <ChartContainer config={contributorChartConfig}>
              <BarChart
                data={topContributors}
                layout="vertical"
                margin={{ right: 48, left: 8 }}
              >
                <CartesianGrid horizontal={false} stroke="rgba(168, 85, 247, 0.05)" />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} hide />
                <XAxis dataKey="commit_count" type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar dataKey="commit_count" fill="hsl(280, 80%, 65%)" radius={6}>
                  <LabelList
                    dataKey="name"
                    position="insideLeft"
                    offset={8}
                    style={{ fill: 'white', fontWeight: 600 }}
                    fontSize={11}
                  />
                  <LabelList
                    dataKey="commit_count"
                    position="right"
                    offset={8}
                    style={{ fill: '#f472b6', fontWeight: 700 }}
                    fontSize={11}
                    formatter={(v) => `${v} commits`}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  );
}