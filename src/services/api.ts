import {
  mockDashboardStats,
  mockDocuments,
  mockKernelEvents,
  mockModelHealth,
  mockUsageLogs,
  mockWorkspaces,
} from '@/services/mockData'
import type { ChatMessage, DocumentItem, LlmModel, Workspace } from '@/types'

function delay(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  await delay()
  return mockWorkspaces
}

export async function fetchWorkspace(id: string): Promise<Workspace | undefined> {
  await delay()
  return mockWorkspaces.find((w) => w.id === id)
}

export async function fetchDocuments(workspaceId?: string): Promise<DocumentItem[]> {
  const qs = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ''
  try {
    const res = await fetch(`/api/documents${qs}`)
    const data = (await res.json()) as {
      documents?: Array<{
        id: string
        workspaceId: string
        filename: string
        type: DocumentItem['type']
        accessLevel: DocumentItem['accessLevel']
        uploadedBy: string
        uploadedAt: string
        status: DocumentItem['status']
        sizeLabel: string
      }>
      error?: string
    }
    if (!res.ok) throw new Error(data.error || 'Failed to load documents')
    return (data.documents ?? []).map((d) => ({
      id: d.id,
      workspaceId: d.workspaceId,
      filename: d.filename,
      type: d.type,
      storageUrl: '#',
      uploadedBy: d.uploadedBy ?? 'system',
      uploadedAt: d.uploadedAt,
      accessLevel: d.accessLevel,
      status: d.status,
      sizeLabel: d.sizeLabel,
    }))
  } catch {
    await delay()
    if (!workspaceId) return mockDocuments
    return mockDocuments.filter((d) => d.workspaceId === workspaceId)
  }
}

export async function uploadDocument(input: {
  workspaceId: string
  filename: string
  content: string
  type: DocumentItem['type']
  accessLevel?: DocumentItem['accessLevel']
}): Promise<void> {
  const res = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = (await res.json()) as { error?: string }
  if (!res.ok) throw new Error(data.error || 'Upload failed')
}

export async function fetchDashboard(workspaceId?: string) {
  const docs = await fetchDocuments(workspaceId)
  let summary = {
    budgetUsed: 0,
    budgetLimit: mockDashboardStats.budgetLimit,
    monthlyQueries: 0,
    recentQuestions: [] as Array<{ id: string; question: string }>,
  }

  try {
    const qs = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ''
    const res = await fetch(`/api/usage/summary${qs}`)
    if (res.ok) {
      const data = (await res.json()) as {
        budgetUsed: number
        budgetLimit: number
        monthlyQueries: number
        recentQuestions?: Array<{ id: string; question: string }>
      }
      summary = {
        budgetUsed: data.budgetUsed,
        budgetLimit: data.budgetLimit,
        monthlyQueries: data.monthlyQueries,
        recentQuestions: data.recentQuestions ?? [],
      }
    }
  } catch {
    // keep defaults
  }

  const workspaces = mockWorkspaces.map((w) =>
    w.id === workspaceId
      ? { ...w, budgetUsed: summary.budgetUsed, budgetLimit: summary.budgetLimit }
      : w,
  )

  return {
    stats: {
      ...mockDashboardStats,
      documentCount: docs.length || mockDashboardStats.documentCount,
      budgetUsed: Number(summary.budgetUsed.toFixed(4)),
      budgetLimit: summary.budgetLimit,
      monthlyQueries: summary.monthlyQueries,
    },
    recentChats: summary.recentQuestions.map((q) => ({
      id: q.id,
      role: 'user' as const,
      question: q.question,
      model: 'auto' as const,
      sources: [],
      routeReason: '',
      latencyMs: 0,
      createdAt: new Date().toISOString(),
    })),
    recentDocuments: docs.slice(0, 5),
    workspaces,
  }
}

const CHAT_KEY_PREFIX = 'kh_chat_history:'
const CHAT_HISTORY_LIMIT = 80
const VALID_MODELS = new Set(['gpt', 'claude', 'gemini', 'perplexity', 'auto'])
const VALID_ROLES = new Set(['user', 'assistant'])

function chatStorageKey(workspaceId: string): string {
  return `${CHAT_KEY_PREFIX}${workspaceId || 'ws-hr'}`
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  if (typeof m.id !== 'string' || !m.id) return false
  if (typeof m.role !== 'string' || !VALID_ROLES.has(m.role)) return false
  if (typeof m.model !== 'string' || !VALID_MODELS.has(m.model)) return false
  if (typeof m.routeReason !== 'string') return false
  if (typeof m.latencyMs !== 'number') return false
  if (typeof m.createdAt !== 'string') return false
  if (!Array.isArray(m.sources)) return false
  return true
}

function normalizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isChatMessage)
}

function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= CHAT_HISTORY_LIMIT) return messages
  return messages.slice(messages.length - CHAT_HISTORY_LIMIT)
}

export function loadChatHistory(workspaceId = 'ws-hr'): ChatMessage[] {
  try {
    const raw = localStorage.getItem(chatStorageKey(workspaceId))
    if (!raw) return []
    return trimMessages(normalizeMessages(JSON.parse(raw)))
  } catch {
    return []
  }
}

export function saveChatHistory(
  workspaceId: string,
  messages: ChatMessage[],
): ChatMessage[] {
  const trimmed = trimMessages(normalizeMessages(messages))
  try {
    localStorage.setItem(chatStorageKey(workspaceId || 'ws-hr'), JSON.stringify(trimmed))
  } catch {
    // Quota / private mode — keep in-memory return value
  }
  return trimmed
}

export async function fetchChatHistory(
  workspaceId = 'ws-hr',
): Promise<ChatMessage[]> {
  await delay(50)
  return loadChatHistory(workspaceId)
}

export async function sendChat(
  question: string,
  model: LlmModel,
  history: ChatMessage[] = [],
  workspaceId?: string,
): Promise<ChatMessage[]> {
  const ws = workspaceId || 'ws-hr'
  const now = new Date().toISOString()
  const userMsg: ChatMessage = {
    id: `u-${Date.now()}`,
    role: 'user',
    question,
    model,
    sources: [],
    routeReason: model === 'auto' ? 'Auto Mode' : 'manual',
    latencyMs: 0,
    createdAt: now,
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, model, workspaceId: ws }),
  })

  const data = (await res.json()) as {
    answer?: string
    model?: LlmModel
    sources?: string[]
    routeReason?: string
    latencyMs?: number
    fallbackUsed?: boolean
    mode?: ChatMessage['mode']
    deliberation?: ChatMessage['deliberation']
    error?: string
  }

  if (!res.ok) {
    throw new Error(data.error || `Chat API failed (${res.status})`)
  }

  const assistantMsg: ChatMessage = {
    id: `a-${Date.now()}`,
    role: 'assistant',
    answer: data.answer ?? '',
    model: (data.model as LlmModel) ?? (model === 'auto' ? 'gpt' : model),
    sources: data.sources ?? [],
    routeReason: data.routeReason ?? '',
    latencyMs: data.latencyMs ?? 0,
    createdAt: new Date().toISOString(),
    fallbackUsed: Boolean(data.fallbackUsed),
    mode: data.mode,
    deliberation: data.deliberation,
  }

  const next = [...history, userMsg, assistantMsg]
  return saveChatHistory(ws, next)
}

export async function fetchAnalytics(workspaceId?: string) {
  try {
    const qs = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ''
    const res = await fetch(`/api/usage/analytics${qs}`)
    if (!res.ok) throw new Error('analytics failed')
    const data = (await res.json()) as {
      usageLogs: typeof mockUsageLogs
      kernelEvents: typeof mockKernelEvents
      modelHealth: typeof mockModelHealth
      throughput: number[]
      totals?: { cost: number; requests: number; tokens: number }
    }
    return data
  } catch {
    await delay()
    return {
      usageLogs: mockUsageLogs,
      kernelEvents: mockKernelEvents,
      modelHealth: mockModelHealth,
      throughput: [42, 55, 48, 70, 63, 80, 74, 90, 85, 78, 95, 88],
    }
  }
}

export async function fetchSettings() {
  await delay()
  return {
    fallbackOrder: ['gpt', 'claude', 'gemini', 'perplexity'] as LlmModel[],
    autoMode: true,
    latencyOpt: true,
    contextCompression: false,
  }
}
