import { Navigate, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { useAppStore } from '@/store/AppStore'
import { useState } from 'react'

export function LoginPage() {
  const { user, loading, login } = useAppStore()
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  if (!loading && user) return <Navigate to="/" replace />

  async function handleLogin() {
    setBusy(true)
    try {
      await login()
      navigate('/')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 halftone-dot">
      <div className="pointer-events-none absolute inset-0 brushed-metal opacity-60" />
      <div className="relative z-10 w-full max-w-md space-y-8 rounded bg-surface-container-low p-8 milled-edge hard-shadow">
        <div className="space-y-4 text-center">
          <div className="mx-auto w-full max-w-[280px]">
            <BrandLogo className="drop-shadow-[0_0_18px_rgba(108,56,255,0.4)]" />
          </div>
          <p className="text-sm text-on-surface-variant">
            조직 문서를 가장 잘 이해하는 AI 업무 비서
          </p>
          <MonoLabel className="text-outline">Mock Google Auth · Demo Mode</MonoLabel>
        </div>

        <Button
          className="w-full py-3"
          disabled={busy}
          onClick={() => void handleLogin()}
        >
          <Icon name="login" />
          {busy ? 'Signing in…' : 'Continue with Google'}
        </Button>

        <p className="text-center text-xs text-outline">
          Firebase Auth는 이후 단계에서 연결됩니다.
        </p>
      </div>
    </div>
  )
}
