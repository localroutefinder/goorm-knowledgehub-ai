import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/AppStore'

export function ProtectedRoute() {
  const { user, loading } = useAppStore()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-sm text-outline">Booting KnowledgeHub…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
