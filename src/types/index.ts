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

export type LlmModel = 'gpt' | 'claude' | 'gemini' | 'perplexity' | 'auto'

export type PromptMode = 'docs' | 'hybrid' | 'web'

export interface ChatGenerationPrefs {
  temperature: number
  maxTokens: number
  systemInstructions: string
  includeWebSearch: boolean
}

export const DEFAULT_GENERATION_PREFS: ChatGenerationPrefs = {
  temperature: 0.3,
  maxTokens: 1024,
  systemInstructions: '',
  includeWebSearch: false,
}

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
