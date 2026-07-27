import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getCurrentUser, loginWithGoogle, logout as authLogout } from '@/services/auth'
import type { LlmModel, User } from '@/types'

interface AppState {
  user: User | null
  loading: boolean
  selectedWorkspaceId: string
  selectedModel: LlmModel
  login: () => Promise<void>
  logout: () => void
  setWorkspaceId: (id: string) => void
  setModel: (model: LlmModel) => void
}

const AppContext = createContext<AppState | null>(null)

const WS_KEY = 'kh_workspace'
const MODEL_KEY = 'kh_model'

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    () => localStorage.getItem(WS_KEY) ?? 'ws-hr',
  )
  const [selectedModel, setSelectedModel] = useState<LlmModel>(
    () => (localStorage.getItem(MODEL_KEY) as LlmModel) ?? 'auto',
  )

  useEffect(() => {
    setUser(getCurrentUser())
    setLoading(false)
  }, [])

  const login = useCallback(async () => {
    const u = await loginWithGoogle()
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    authLogout()
    setUser(null)
  }, [])

  const setWorkspaceId = useCallback((id: string) => {
    localStorage.setItem(WS_KEY, id)
    setSelectedWorkspaceId(id)
  }, [])

  const setModel = useCallback((model: LlmModel) => {
    localStorage.setItem(MODEL_KEY, model)
    setSelectedModel(model)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      selectedWorkspaceId,
      selectedModel,
      login,
      logout,
      setWorkspaceId,
      setModel,
    }),
    [
      user,
      loading,
      selectedWorkspaceId,
      selectedModel,
      login,
      logout,
      setWorkspaceId,
      setModel,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore must be used within AppProvider')
  return ctx
}
