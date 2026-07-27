import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '@/components/shell/AppShell'
import { MetallicCard } from '@/components/ui/MetallicCard'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { fetchDocuments, fetchWorkspace } from '@/services/api'

export function WorkspaceDetailPage() {
  const { id = '' } = useParams()
  const { data: workspace } = useQuery({
    queryKey: ['workspace', id],
    queryFn: () => fetchWorkspace(id),
  })
  const { data: docs = [] } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => fetchDocuments(id),
  })

  const budgetPct = workspace
    ? Math.round((workspace.budgetUsed / workspace.budgetLimit) * 100)
    : 0

  return (
    <AppShell title="Knowledge Base">
      <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 md:px-10">
        <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
          <Link to="/workspaces" className="hover:text-secondary">
            Workspaces
          </Link>
          <Icon name="chevron_right" className="text-[16px]" />
          <span className="text-primary font-bold">{workspace?.department ?? id}</span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-black uppercase metallic-title">
              {workspace?.department} Knowledge Base
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">{workspace?.description}</p>
          </div>
          <StatusBadge status={workspace?.status ?? 'operational'} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Documents', value: docs.length, icon: 'folder' },
            { label: 'Members', value: workspace?.members.length ?? 0, icon: 'group' },
            { label: 'Budget Used', value: `${budgetPct}%`, icon: 'payments' },
            { label: 'Org', value: workspace?.organization ?? '—', icon: 'business' },
          ].map((kpi) => (
            <MetallicCard key={kpi.label} className="p-4">
              <div className="flex items-center justify-between">
                <MonoLabel className="text-outline">{kpi.label}</MonoLabel>
                <Icon name={kpi.icon} className="text-secondary" />
              </div>
              <p className="mt-2 font-display text-2xl font-bold">{kpi.value}</p>
            </MetallicCard>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <MetallicCard className="p-6">
            <h3 className="mb-4 font-display text-lg font-bold">Live Data Sources</h3>
            <ul className="space-y-3">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded border border-white/5 bg-surface-variant/20 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{doc.filename}</p>
                    <MonoLabel className="text-outline">
                      {doc.accessLevel} · {doc.sizeLabel}
                    </MonoLabel>
                  </div>
                  <StatusBadge status={doc.status} />
                </li>
              ))}
            </ul>
          </MetallicCard>

          <MetallicCard className="overflow-hidden p-0">
            <div className="fallback-stripe h-2" />
            <div className="space-y-4 p-6">
              <h3 className="font-display text-lg font-bold">Model Fallback Banner</h3>
              <p className="text-sm text-on-surface-variant">
                기본 모델 장애·타임아웃·정책 위반 시 GPT → Claude → Gemini → Perplexity 순으로
                자동 전환됩니다.
              </p>
              <Button variant="secondary" className="text-xs">
                <Icon name="tune" />
                Optimize Fallback
              </Button>
              <div>
                <MonoLabel className="mb-2 block text-outline">Inference Performance</MonoLabel>
                <div className="flex h-24 items-end gap-1">
                  {[40, 55, 48, 70, 62, 80, 75, 90, 68, 85].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm bg-secondary-container/70"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </MetallicCard>
        </div>
      </div>
    </AppShell>
  )
}
