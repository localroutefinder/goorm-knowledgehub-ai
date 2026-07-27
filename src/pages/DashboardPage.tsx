import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/shell/AppShell'
import { MetallicCard } from '@/components/ui/MetallicCard'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Icon } from '@/components/ui/Icon'
import { fetchDashboard } from '@/services/api'
import { useAppStore } from '@/store/AppStore'

export function DashboardPage() {
  const { selectedWorkspaceId, setWorkspaceId } = useAppStore()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', selectedWorkspaceId],
    queryFn: () => fetchDashboard(selectedWorkspaceId),
  })

  const active = data?.workspaces.find((w) => w.id === selectedWorkspaceId)
  const budgetPct =
    data && data.stats.budgetLimit > 0
      ? Math.min(
          100,
          Math.round((data.stats.budgetUsed / data.stats.budgetLimit) * 100),
        )
      : 0

  return (
    <AppShell title="Dashboard">
      <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 md:px-10">
        <MetallicCard className="brushed-metal overflow-hidden p-6 md:p-8">
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <MonoLabel className="text-tertiary">Active Workspace</MonoLabel>
              <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-tight metallic-title md:text-4xl">
                {active?.department ?? '—'} Knowledge Hub
              </h2>
              <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
                {active?.organization} · {active?.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data?.workspaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWorkspaceId(w.id)}
                  className={`rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
                    w.id === selectedWorkspaceId
                      ? 'border-secondary bg-primary-container text-on-primary-container'
                      : 'border-outline-variant text-on-surface-variant hover:border-secondary'
                  }`}
                >
                  {w.department}
                </button>
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute -right-4 bottom-0 font-display text-[120px] font-black leading-none text-white/5">
            GOORM
          </div>
        </MetallicCard>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Documents',
              value: data?.stats.documentCount ?? '—',
              icon: 'description',
              accent: 'text-secondary',
            },
            {
              label: 'Active LLMs',
              value: data?.stats.activeLlms ?? '—',
              icon: 'psychology',
              accent: 'text-primary',
            },
            {
              label: 'Accuracy',
              value: data ? `${data.stats.accuracyPct}%` : '—',
              icon: 'verified',
              accent: 'text-secondary-fixed-dim',
            },
            {
              label: 'Monthly Queries',
              value: data?.stats.monthlyQueries.toLocaleString() ?? '—',
              icon: 'query_stats',
              accent: 'text-tertiary',
            },
          ].map((stat) => (
            <MetallicCard key={stat.label} className="p-5 hard-shadow" hover>
              <div className="flex items-start justify-between">
                <MonoLabel className="text-outline">{stat.label}</MonoLabel>
                <Icon name={stat.icon} className={stat.accent} />
              </div>
              <p className="mt-3 font-display text-3xl font-black text-brushed-silver">
                {isLoading ? '…' : stat.value}
              </p>
            </MetallicCard>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <MetallicCard className="p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">월간 사용량 · 예산</h3>
              <StatusBadge
                status={budgetPct > 85 ? 'degraded' : 'operational'}
                label={`${budgetPct}% used`}
              />
            </div>
            <div className="mb-2 flex justify-between font-mono text-xs text-outline">
              <span>${(data?.stats.budgetUsed ?? 0).toFixed(4)}</span>
              <span>Limit ${data?.stats.budgetLimit ?? 0}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-sm bg-surface-container-lowest">
              <div
                className={`h-full ${budgetPct > 85 ? 'bg-tertiary-container' : 'bg-secondary-container'}`}
                style={{ width: `${Math.max(budgetPct, budgetPct > 0 ? 2 : 0)}%` }}
              />
            </div>
            <div className="mt-6 space-y-3">
              <MonoLabel className="text-outline">Recent Questions</MonoLabel>
              {(data?.recentChats?.length ?? 0) > 0 ? (
                data?.recentChats.map((c) => (
                  <Link
                    key={c.id}
                    to="/chat"
                    className="block rounded border border-white/5 bg-surface-variant/20 p-3 text-sm hover:border-secondary/40"
                  >
                    {c.question}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-on-surface-variant">
                  아직 기록된 질문이 없습니다. Chat에서 질문하면 여기에 표시됩니다.
                </p>
              )}
            </div>
          </MetallicCard>

          <MetallicCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Recent Uploads</h3>
              <Link
                to="/documents"
                className="font-mono text-[11px] uppercase text-secondary hover:underline"
              >
                View all
              </Link>
            </div>
            <ul className="space-y-3">
              {data?.recentDocuments.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-2 border-b border-white/5 pb-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon
                      name={doc.type === 'pdf' ? 'picture_as_pdf' : 'article'}
                      className="shrink-0 text-secondary"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.filename}</p>
                      <MonoLabel className="text-outline">{doc.sizeLabel}</MonoLabel>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </li>
              ))}
            </ul>
          </MetallicCard>
        </div>
      </div>
    </AppShell>
  )
}
