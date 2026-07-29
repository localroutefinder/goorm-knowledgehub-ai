export type UserRole = 'admin' | 'member' | 'viewer'

export interface User {
  id: string
  name: string
  email: string
  photoURL: string
  role: UserRole
  createdAt: string
}

export type WorkspaceStatus = 'operational' | 'syncing' | 'degraded'

export interface Workspace {
  id: string
  organization: string
  department: string
  owner: string
  members: string[]
  budgetLimit: number
  budgetUsed: number
  status: WorkspaceStatus
  documentCount: number
  description?: string
}

export type DocumentType = 'pdf' | 'md' | 'txt'
export type AccessLevel = 'public' | 'workspace' | 'restricted'
export type DocumentIndexStatus = 'indexed' | 'syncing' | 'failed'

export interface DocumentItem {
  id: string
  workspaceId: string
  filename: string
  type: DocumentType
  storageUrl: string
  uploadedBy: string
  uploadedAt: string
  accessLevel: AccessLevel
  status: DocumentIndexStatus
  sizeLabel: string
}

export type LlmModel = 'gpt' | 'claude' | 'gemini' | 'perplexity' | 'local' | 'auto'

export type PromptMode = 'docs' | 'hybrid' | 'web'

export interface ChatGenerationPrefs {
  temperature: number
  maxTokens: number
  systemInstructions: string
  includeWebSearch: boolean
  preferDocuments: boolean
}

export const DEFAULT_GENERATION_PREFS: ChatGenerationPrefs = {
  temperature: 0.3,
  maxTokens: 1024,
  systemInstructions: '',
  includeWebSearch: false,
  preferDocuments: true,
}

/** Quick system-instruction presets for Chat / Settings */
export const SYSTEM_INSTRUCTION_PRESETS: {
  id: string
  label: string
  text: string
}[] = [
  {
    id: 'hr-docs',
    label: 'HR 문서 근거',
    text: '당신은 조직 HR 지식비서입니다. 제공된 문서 컨텍스트를 우선 근거로 한국어로 답하세요. 조항·조건이 있으면 명시하고, 문서에 없으면 추측하지 말고 확인할 수 없다고 말하세요.',
  },
  {
    id: 'local-brief',
    label: 'Local 간결',
    text: '한국어로 짧고 정확하게 답하세요. 서론·사과·이모지 없이 결론과 근거만 제시하세요. 코딩 질문이면 동작하는 최소 코드부터 주세요.',
  },
  {
    id: 'bullet',
    label: '불릿 요약',
    text: '답변은 불릿 위주로 작성하세요. 핵심만 3~7개로 정리하고, 근거 문서명이 있으면 끝에 표기하세요.',
  },
]

export type DeliberationRole = 'draft' | 'chair'

export interface DeliberationStep {
  round: 1 | 2
  model: Exclude<LlmModel, 'auto'>
  role: DeliberationRole
  content: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  question?: string
  answer?: string
  model: LlmModel
  sources: string[]
  routeReason: string
  latencyMs: number
  createdAt: string
  fallbackUsed?: boolean
  mode?: PromptMode
  deliberation?: DeliberationStep[]
}

export interface ChatSession {
  id: string
  workspaceId: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

export interface UsageLog {
  id: string
  workspaceId: string
  userId: string
  model: LlmModel
  tokens: number
  cost: number
  fallbackUsed: boolean
  createdAt: string
}

export interface RouteLog {
  id: string
  workspaceId: string
  model: LlmModel
  routeReason: string
  latencyMs: number
  success: boolean
  createdAt: string
}

export interface DashboardStats {
  documentCount: number
  activeLlms: number
  accuracyPct: number
  monthlyQueries: number
  budgetLimit: number
  budgetUsed: number
}

export interface KernelEvent {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  createdAt: string
}

export interface ModelHealth {
  model: LlmModel
  label: string
  status: 'operational' | 'degraded'
  latencyMs: number
}
