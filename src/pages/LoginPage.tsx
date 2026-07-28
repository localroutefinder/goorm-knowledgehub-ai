import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { isFirebaseConfigured } from '@/services/auth'
import { useAppStore } from '@/store/AppStore'

function formatAuthError(err: unknown): string | null {
  if (!err || typeof err !== 'object') return '로그인에 실패했습니다.'
  const code = 'code' in err ? String((err as { code?: string }).code ?? '') : ''
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/user-cancelled'
  ) {
    return null
  }
  if (code === 'auth/popup-blocked') {
    return '팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.'
  }
  if (code === 'auth/unauthorized-domain') {
    return '이 도메인은 Firebase Authorized domains에 등록되지 않았습니다.'
  }
  const message =
    'message' in err && typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message
      : '로그인에 실패했습니다.'
  return message
}

export function LoginPage() {
  const { user, loading, login } = useAppStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from') || '/'
  const firebaseReady = isFirebaseConfigured()

  if (!loading && user) return <Navigate to={from} replace />

  async function handleLogin() {
    setBusy(true)
    setError(null)
    try {
      await login()
      navigate(from)
    } catch (err) {
      const msg = formatAuthError(err)
      if (msg) setError(msg)
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
          <MonoLabel className="text-outline">
            {firebaseReady ? 'Google · Firebase Auth' : 'Mock Google Auth · Demo Mode'}
          </MonoLabel>
        </div>

        <Button
          className="w-full py-3"
          disabled={busy}
          onClick={() => void handleLogin()}
        >
          <Icon name="login" />
          {busy ? 'Signing in…' : 'Continue with Google'}
        </Button>

        {error ? (
          <p className="rounded border border-error/40 bg-error-container/20 px-3 py-2 text-center text-xs text-error">
            {error}
          </p>
        ) : null}

        <p className="text-center text-xs text-outline">
          {firebaseReady
            ? 'Google 계정으로 로그인합니다.'
            : 'VITE_FIREBASE_* 미설정 — Demo mock 로그인으로 동작합니다.'}
        </p>

        <p className="text-center text-sm">
          <Link
            to="/chat"
            className="font-mono text-xs text-secondary underline-offset-2 hover:underline"
          >
            로그인 없이 3회 체험하기 →
          </Link>
        </p>
      </div>
    </div>
  )
}
