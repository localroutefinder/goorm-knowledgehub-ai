import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/shell/AppShell'
import { MetallicCard } from '@/components/ui/MetallicCard'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { fetchAnalytics } from '@/services/api'
import { useAppStore } from '@/store/AppStore'

export function AnalyticsPage() {
  const { selectedWorkspaceId } = useAppStore()
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', selectedWorkspaceId],
    queryFn: () => fetchAnalytics(selectedWorkspaceId),
  })

  const maxT = Math.max(1, ...(data?.throughput ?? [1]))

  return (
    <AppShell title="System Pulse">
      <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 md:px-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <MonoLabel className="text-secondary">Admin Control Center</MonoLabel>
            <h2 className="mt-1 font-display text-3xl font-black uppercase metallic-title">
              Analytics
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Neon usage_logs 기반 · 팀별 사용량 · 비용 · Fallback 이벤트
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="text-xs">
              <Icon name="download" />
              Export
            </Button>
            <Button variant="ghost" className="text-xs">
              Clear
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <MetallicCard className="p-6 lg:col-span-2 hard-shadow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">API Throughput</h3>
              <MonoLabel className="text-outline">Last 12 slots</MonoLabel>
            </div>
            <div className="flex h-48 items-end gap-2">
              {(data?.throughput ?? Array.from({ length: 12 }, () => 10)).map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-sm bg-gradient-to-t from-primary-container to-secondary-container"
                    style={{ height: `${(v / maxT) * 100}%` }}
                  />
                  <span className="font-mono text-[9px] text-outline">{i + 1}</span>
                </div>
              ))}
            </div>
          </MetallicCard>

          <MetallicCard className="p-6">
            <h3 className="mb-4 font-display text-lg font-bold">Model Health</h3>
            <ul className="space-y-3">
              {(data?.modelHealth ?? []).map((m) => (
                <li
                  key={m.model}
                  className="flex items-center justify-between rounded border border-white/5 bg-surface-variant/20 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{m.label}</p>
                    <MonoLabel className="text-outline">
                      {('requests' in m ? Number((m as { requests?: number }).requests ?? 0) : 0)} req
                      {' · $'}
                      {('cost' in m
                        ? Number((m as { cost?: number }).cost ?? 0).toFixed(4)
                        : '0.0000')}
                    </MonoLabel>
                  </div>
                  <StatusBadge status={m.status} />
                </li>
              ))}
              {isLoading ? <p className="text-sm text-outline">Loading…</p> : null}
            </ul>
          </MetallicCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <MetallicCard className="p-6 lg:col-span-2">
            <h3 className="mb-4 font-display text-lg font-bold">Kernel Events</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto font-mono text-xs">
              {(data?.kernelEvents ?? []).map((e) => (
                <div
                  key={e.id}
                  className="flex gap-3 rounded border border-white/5 bg-surface-container-lowest px-3 py-2"
                >
                  <StatusBadge status={e.level} />
                  <span className="text-on-surface-variant">{e.message}</span>
                  <span className="ml-auto shrink-0 text-outline">
                    {new Date(e.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </MetallicCard>

          <MetallicCard className="space-y-4 p-6">
            <h3 className="font-display text-lg font-bold">Usage Costs</h3>
            {(data?.usageLogs ?? []).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between border-b border-white/5 pb-3 text-sm"
              >
                <div>
                  <p className="font-medium uppercase">{log.model}</p>
                  <MonoLabel className="text-outline">
                    {log.tokens} tok · {log.fallbackUsed ? 'fallback' : 'direct'}
                  </MonoLabel>
                </div>
                <span className="font-mono text-secondary">${log.cost.toFixed(3)}</span>
              </div>
            ))}
            <div className="rounded border border-tertiary/30 bg-tertiary-container/10 p-3 text-xs text-tertiary">
              보안 위반 탐지: 최근 24h 내 0건 (mock)
            </div>
          </MetallicCard>
        </div>
      </div>
    </AppShell>
  )
}
