import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loginWithGoogle,
  logout as authLogout,
  subscribeAuth,
} from '@/services/auth'
import {
  DEFAULT_GENERATION_PREFS,
  type ChatGenerationPrefs,
  type LlmModel,
  type User,
} from '@/types'

interface AppState {
  user: User | null
  loading: boolean
  selectedWorkspaceId: string
  selectedModel: LlmModel
  generationPrefs: ChatGenerationPrefs
  login: () => Promise<void>
  logout: () => Promise<void>
  setWorkspaceId: (id: string) => void
  setModel: (model: LlmModel) => void
  setGenerationPrefs: (prefs: Partial<ChatGenerationPrefs>) => void
}

const AppContext = createContext<AppState | null>(null)

const WS_KEY = 'kh_workspace'
const MODEL_KEY = 'kh_model'
const GEN_KEY = 'kh_generation_prefs'

function loadGenerationPrefs(): ChatGenerationPrefs {
  try {
    const raw = localStorage.getItem(GEN_KEY)
    if (!raw) return { ...DEFAULT_GENERATION_PREFS }
    const parsed = JSON.parse(raw) as Partial<ChatGenerationPrefs>
    return {
      temperature:
        typeof parsed.temperature === 'number'
          ? Math.min(2, Math.max(0, parsed.temperature))
          : DEFAULT_GENERATION_PREFS.temperature,
      maxTokens:
        typeof parsed.maxTokens === 'number'
          ? Math.min(8192, Math.max(64, Math.round(parsed.maxTokens)))
          : DEFAULT_GENERATION_PREFS.maxTokens,
      systemInstructions:
        typeof parsed.systemInstructions === 'string'
          ? parsed.systemInstructions
          : '',
      includeWebSearch: Boolean(parsed.includeWebSearch),
    }
  } catch {
    return { ...DEFAULT_GENERATION_PREFS }
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    () => localStorage.getItem(WS_KEY) ?? 'ws-hr',
  )
  const [selectedModel, setSelectedModel] = useState<LlmModel>(
    () => (localStorage.getItem(MODEL_KEY) as LlmModel) ?? 'auto',
  )
  const [generationPrefs, setGenerationPrefsState] = useState<ChatGenerationPrefs>(
    loadGenerationPrefs,
  )

  useEffect(() => {
    const unsubscribe = subscribeAuth((next) => {
      setUser(next)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = useCallback(async () => {
    const u = await loginWithGoogle()
    setUser(u)
  }, [])

  const logout = useCallback(async () => {
    await authLogout()
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

  const setGenerationPrefs = useCallback((prefs: Partial<ChatGenerationPrefs>) => {
    setGenerationPrefsState((prev) => {
      const next = { ...prev, ...prefs }
      try {
        localStorage.setItem(GEN_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      selectedWorkspaceId,
      selectedModel,
      generationPrefs,
      login,
      logout,
      setWorkspaceId,
      setModel,
      setGenerationPrefs,
    }),
    [
      user,
      loading,
      selectedWorkspaceId,
      selectedModel,
      generationPrefs,
      login,
      logout,
      setWorkspaceId,
      setModel,
      setGenerationPrefs,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore must be used within AppProvider')
  return ctx
}
