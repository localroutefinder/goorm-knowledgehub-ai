import {
  mockDashboardStats,
  mockDocuments,
  mockKernelEvents,
  mockModelHealth,
  mockUsageLogs,
  mockWorkspaces,
} from '@/services/mockData'
import {
  ensureActiveSession,
  listSessions,
  saveSessionMessages,
} from '@/services/chatSessions'
import { getOrCreateGuestId } from '@/services/guestId'
import type {
  ChatGenerationPrefs,
  ChatMessage,
  DocumentItem,
  LlmModel,
  Workspace,
} from '@/types'

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

export async function fetchChatHistory(
  workspaceId = 'ws-hr',
  sessionId?: string,
): Promise<ChatMessage[]> {
  await delay(50)
  const session = sessionId
    ? listSessions(workspaceId).find((s) => s.id === sessionId)
    : ensureActiveSession(workspaceId)
  return session?.messages ?? []
}

export async function sendChat(
  question: string,
  model: LlmModel,
  history: ChatMessage[] = [],
  workspaceId?: string,
  sessionId?: string,
  generation?: Partial<ChatGenerationPrefs>,
  authUserId?: string | null,
): Promise<ChatMessage[]> {
  const ws = workspaceId || 'ws-hr'
  const active = sessionId
    ? listSessions(ws).find((s) => s.id === sessionId) ?? ensureActiveSession(ws)
    : ensureActiveSession(ws)
  const sid = active.id

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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authUserId) {
    headers['X-Auth-User'] = authUserId
  } else {
    headers['X-Guest-Id'] = getOrCreateGuestId()
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question,
      model,
      workspaceId: ws,
      temperature: generation?.temperature,
      maxTokens: generation?.maxTokens,
      systemInstructions: generation?.systemInstructions || undefined,
      includeWebSearch: generation?.includeWebSearch ?? false,
    }),
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
    code?: string
    remaining?: number
    limit?: number
  }

  if (!res.ok) {
    const err = new Error(data.error || `Chat API failed (${res.status})`) as Error & {
      code?: string
      remaining?: number
      status?: number
    }
    err.code = data.code
    err.remaining = data.remaining
    err.status = res.status
    throw err
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
  return saveSessionMessages(ws, sid, next).messages
}

export async function fetchChatQuota(authUserId?: string | null) {
  const headers: Record<string, string> = {}
  if (authUserId) {
    headers['X-Auth-User'] = authUserId
  } else {
    headers['X-Guest-Id'] = getOrCreateGuestId()
  }
  const res = await fetch('/api/chat/quota', { headers })
  if (!res.ok) {
    return {
      mode: 'guest' as const,
      limit: 3,
      used: 0,
      remaining: 3 as number | null,
    }
  }
  return (await res.json()) as {
    mode: 'guest' | 'authenticated'
    limit: number
    used: number
    remaining: number | null
  }
}

export async function fetchModels() {
  const res = await fetch('/api/models')
  if (!res.ok) throw new Error('Failed to fetch models')
  return (await res.json()) as {
    models: Array<{
      id: LlmModel
      label: string
      provider: string
      available: boolean
      description: string
    }>
    defaults: { temperature: number; maxTokens: number; includeWebSearch: boolean }
    googleSearch: boolean
  }
}

/** @deprecated use listSessions / ensureActiveSession — kept for dashboard recent stubs */
export function loadChatHistory(workspaceId = 'ws-hr'): ChatMessage[] {
  return ensureActiveSession(workspaceId).messages
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
