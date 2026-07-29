import type { ChatMessage, ChatSession } from '@/types'

const SESSIONS_KEY_PREFIX = 'kh_chat_sessions:'
const ACTIVE_KEY_PREFIX = 'kh_chat_active:'
const LEGACY_KEY_PREFIX = 'kh_chat_history:'
const SESSION_LIMIT = 30
const MESSAGE_LIMIT = 80

const VALID_MODELS = new Set(['gpt', 'claude', 'gemini', 'perplexity', 'local', 'auto'])
const VALID_ROLES = new Set(['user', 'assistant'])

function sessionsKey(workspaceId: string) {
  return `${SESSIONS_KEY_PREFIX}${workspaceId || 'ws-hr'}`
}

function activeKey(workspaceId: string) {
  return `${ACTIVE_KEY_PREFIX}${workspaceId || 'ws-hr'}`
}

function legacyKey(workspaceId: string) {
  return `${LEGACY_KEY_PREFIX}${workspaceId || 'ws-hr'}`
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
  const msgs = raw.filter(isChatMessage)
  return msgs.length <= MESSAGE_LIMIT ? msgs : msgs.slice(msgs.length - MESSAGE_LIMIT)
}

function isChatSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    typeof s.workspaceId === 'string' &&
    typeof s.title === 'string' &&
    typeof s.createdAt === 'string' &&
    typeof s.updatedAt === 'string' &&
    Array.isArray(s.messages)
  )
}

function sortSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

function trimSessionList(sessions: ChatSession[]): ChatSession[] {
  const sorted = sortSessions(sessions)
  return sorted.length <= SESSION_LIMIT ? sorted : sorted.slice(0, SESSION_LIMIT)
}

function readSessionsRaw(workspaceId: string): ChatSession[] {
  try {
    const raw = localStorage.getItem(sessionsKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return trimSessionList(
      parsed.filter(isChatSession).map((s) => ({
        ...s,
        messages: normalizeMessages(s.messages),
      })),
    )
  } catch {
    return []
  }
}

function writeSessions(workspaceId: string, sessions: ChatSession[]): ChatSession[] {
  const next = trimSessionList(
    sessions.map((s) => ({
      ...s,
      messages: normalizeMessages(s.messages),
    })),
  )
  try {
    localStorage.setItem(sessionsKey(workspaceId), JSON.stringify(next))
  } catch {
    // quota / private mode
  }
  return next
}

function setActiveId(workspaceId: string, sessionId: string | null) {
  try {
    if (!sessionId) localStorage.removeItem(activeKey(workspaceId))
    else localStorage.setItem(activeKey(workspaceId), sessionId)
  } catch {
    // ignore
  }
}

function getActiveId(workspaceId: string): string | null {
  try {
    return localStorage.getItem(activeKey(workspaceId))
  } catch {
    return null
  }
}

function titleFromMessages(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user' && m.question?.trim())
  const q = firstUser?.question?.trim()
  if (!q) return '새 대화'
  return q.length > 40 ? `${q.slice(0, 40)}…` : q
}

/** Migrate flat kh_chat_history → one session, then clear legacy key. */
function migrateLegacy(workspaceId: string): ChatSession[] {
  let sessions = readSessionsRaw(workspaceId)
  if (sessions.length > 0) return sessions

  try {
    const legacyRaw = localStorage.getItem(legacyKey(workspaceId))
    if (!legacyRaw) return []
    const messages = normalizeMessages(JSON.parse(legacyRaw))
    if (messages.length === 0) {
      localStorage.removeItem(legacyKey(workspaceId))
      return []
    }
    const now = new Date().toISOString()
    const session: ChatSession = {
      id: `s-migrated-${Date.now()}`,
      workspaceId: workspaceId || 'ws-hr',
      title: titleFromMessages(messages),
      createdAt: messages[0]?.createdAt ?? now,
      updatedAt: messages[messages.length - 1]?.createdAt ?? now,
      messages,
    }
    sessions = writeSessions(workspaceId, [session])
    setActiveId(workspaceId, session.id)
    localStorage.removeItem(legacyKey(workspaceId))
    return sessions
  } catch {
    return []
  }
}

export function listSessions(workspaceId = 'ws-hr'): ChatSession[] {
  return migrateLegacy(workspaceId)
}

export function getActiveSession(workspaceId = 'ws-hr'): ChatSession | null {
  const sessions = listSessions(workspaceId)
  if (sessions.length === 0) return null
  const activeId = getActiveId(workspaceId)
  const found = activeId ? sessions.find((s) => s.id === activeId) : null
  if (found) return found
  setActiveId(workspaceId, sessions[0].id)
  return sessions[0]
}

export function createSession(workspaceId = 'ws-hr'): ChatSession {
  const ws = workspaceId || 'ws-hr'
  const now = new Date().toISOString()
  const session: ChatSession = {
    id: `s-${Date.now()}`,
    workspaceId: ws,
    title: '새 대화',
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
  const sessions = [session, ...listSessions(ws)]
  writeSessions(ws, sessions)
  setActiveId(ws, session.id)
  return session
}

export function selectSession(
  workspaceId: string,
  sessionId: string,
): ChatSession | null {
  const sessions = listSessions(workspaceId)
  const found = sessions.find((s) => s.id === sessionId)
  if (!found) return null
  setActiveId(workspaceId, sessionId)
  return found
}

export function deleteSession(
  workspaceId: string,
  sessionId: string,
): ChatSession | null {
  const ws = workspaceId || 'ws-hr'
  const sessions = listSessions(ws).filter((s) => s.id !== sessionId)
  writeSessions(ws, sessions)

  const activeId = getActiveId(ws)
  if (activeId === sessionId) {
    if (sessions.length === 0) {
      setActiveId(ws, null)
      return null
    }
    setActiveId(ws, sessions[0].id)
    return sessions[0]
  }
  return getActiveSession(ws)
}

export function ensureActiveSession(workspaceId = 'ws-hr'): ChatSession {
  return getActiveSession(workspaceId) ?? createSession(workspaceId)
}

export function saveSessionMessages(
  workspaceId: string,
  sessionId: string,
  messages: ChatMessage[],
): ChatSession {
  const ws = workspaceId || 'ws-hr'
  const now = new Date().toISOString()
  const trimmed = normalizeMessages(messages)
  const sessions = listSessions(ws)
  const idx = sessions.findIndex((s) => s.id === sessionId)
  if (idx < 0) {
    const session: ChatSession = {
      id: sessionId,
      workspaceId: ws,
      title: titleFromMessages(trimmed),
      createdAt: now,
      updatedAt: now,
      messages: trimmed,
    }
    writeSessions(ws, [session, ...sessions])
    setActiveId(ws, session.id)
    return session
  }

  const prev = sessions[idx]
  const updated: ChatSession = {
    ...prev,
    messages: trimmed,
    updatedAt: now,
    title:
      prev.title === '새 대화' || !prev.title
        ? titleFromMessages(trimmed)
        : prev.title,
  }
  const next = [...sessions]
  next[idx] = updated
  writeSessions(ws, next)
  setActiveId(ws, sessionId)
  return updated
}
