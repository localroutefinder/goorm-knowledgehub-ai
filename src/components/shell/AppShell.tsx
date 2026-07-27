import { NavLink, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { Icon } from '@/components/ui/Icon'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { SearchField } from '@/components/ui/SearchField'
import { useAppStore } from '@/store/AppStore'
import type { ReactNode } from 'react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/chat', label: 'Chat', icon: 'forum' },
  { to: '/documents', label: 'Documents', icon: 'description' },
  { to: '/workspaces', label: 'Workspaces', icon: 'grid_view' },
  { to: '/analytics', label: 'Analytics', icon: 'insights' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

function navClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 px-4 py-3 font-mono text-[12px] tracking-[0.05em] uppercase transition-all duration-100 active:scale-95 ${
    isActive
      ? 'bg-primary-container text-on-primary-container border-l-4 border-secondary'
      : 'border-l-4 border-transparent text-on-surface-variant hover:bg-surface-variant/50 hover:text-secondary'
  }`
}

export function AppShell({
  children,
  title,
  topLinks,
}: {
  children: ReactNode
  title?: string
  topLinks?: ReactNode
}) {
  const { user, logout } = useAppStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-white/10 bg-deep-gunmetal shadow-[4px_0_0_0_#000] lg:flex">
        <div className="flex flex-col items-center border-b border-white/5 px-4 py-5">
          <BrandLogo className="drop-shadow-[0_0_12px_rgba(108,56,255,0.35)]" />
        </div>

        <nav className="flex-1 space-y-1 py-6">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navClass}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/5 p-4">
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-container to-tertiary-container px-4 py-3 font-display text-sm font-bold text-white hard-shadow active:translate-y-1 active:shadow-none"
          >
            <Icon name="add" />
            New Chat
          </button>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="flex w-full items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-tertiary"
          >
            <Icon name="logout" />
            <MonoLabel>Sign out</MonoLabel>
          </button>
        </div>
      </aside>

      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-surface/80 px-4 backdrop-blur-xl halftone-dot md:px-10">
          <div className="flex items-center gap-4">
            <span className="font-display text-xl font-black italic text-primary md:text-2xl">
              {title ?? 'Goorm KnowledgeHub'}
            </span>
            {topLinks}
          </div>
          <div className="flex items-center gap-3">
            <SearchField className="hidden w-56 md:flex" placeholder="Global search…" />
            <button type="button" className="text-on-surface-variant hover:text-primary">
              <Icon name="notifications" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 overflow-hidden rounded-full border border-primary/50 bg-surface-variant">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <span className="hidden text-sm text-on-surface-variant sm:inline">
                {user?.name}
              </span>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] pb-20 lg:pb-0">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/10 bg-deep-gunmetal lg:hidden">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-[10px] ${
                isActive ? 'text-secondary' : 'text-on-surface-variant'
              }`
            }
          >
            <Icon name={item.icon} className="text-[20px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
