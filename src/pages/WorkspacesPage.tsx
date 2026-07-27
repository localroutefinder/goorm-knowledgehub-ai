import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/shell/AppShell'
import { MetallicCard } from '@/components/ui/MetallicCard'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Icon } from '@/components/ui/Icon'
import { fetchWorkspaces } from '@/services/api'
import { useAppStore } from '@/store/AppStore'

const accents = [
  'from-primary-container',
  'from-secondary-container',
  'from-tertiary-container',
  'from-gpt',
  'from-claude',
]

export function WorkspacesPage() {
  const { setWorkspaceId } = useAppStore()
  const { data = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
  })

  return (
    <AppShell title="Workspaces">
      <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 md:px-10">
        <div>
          <MonoLabel className="text-secondary">Global Intelligence Infrastructure</MonoLabel>
          <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-tight metallic-title">
            Workspaces
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            부서별 독립 문서 · 검색 · 권한 · 비용 추적
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <MetallicCard key={i} className="h-48 animate-pulse" />
              ))
            : null}

          {data.map((ws, i) => (
            <Link
              key={ws.id}
              to={`/workspaces/${ws.id}`}
              onClick={() => setWorkspaceId(ws.id)}
              className="block"
            >
              <MetallicCard className="overflow-hidden hard-shadow" hover>
                <div className={`h-1.5 bg-gradient-to-r ${accents[i % accents.length]} to-transparent`} />
                <div className="space-y-4 p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <MonoLabel className="text-outline">{ws.organization}</MonoLabel>
                      <h3 className="font-display text-2xl font-bold">{ws.department}</h3>
                    </div>
                    <StatusBadge status={ws.status} />
                  </div>
                  <p className="text-sm text-on-surface-variant line-clamp-2">
                    {ws.description}
                  </p>
                  <div className="flex items-center justify-between border-t border-white/5 pt-4 font-mono text-xs text-outline">
                    <span>{ws.documentCount} docs</span>
                    <span>
                      ${ws.budgetUsed}/${ws.budgetLimit}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="group" className="text-[16px]" />
                      {ws.members.length}
                    </span>
                  </div>
                </div>
              </MetallicCard>
            </Link>
          ))}

          <MetallicCard className="flex min-h-[220px] items-center justify-center border-dashed border-outline-variant p-6">
            <button
              type="button"
              className="flex flex-col items-center gap-2 text-on-surface-variant hover:text-secondary"
            >
              <Icon name="add_box" className="text-4xl" />
              <MonoLabel>Create workspace</MonoLabel>
            </button>
          </MetallicCard>
        </div>
      </div>
    </AppShell>
  )
}
