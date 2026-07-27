/**
 * Smoke: workspace-scoped chat history localStorage persistence logic
 * (mirrors src/services/api.ts helpers without Vite path aliases).
 */
const store = new Map()
const localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null
  },
  setItem(key, value) {
    store.set(String(key), String(value))
  },
}

const CHAT_KEY_PREFIX = 'kh_chat_history:'
const CHAT_HISTORY_LIMIT = 80
const VALID_MODELS = new Set(['gpt', 'claude', 'gemini', 'perplexity', 'auto'])
const VALID_ROLES = new Set(['user', 'assistant'])

function chatStorageKey(workspaceId) {
  return `${CHAT_KEY_PREFIX}${workspaceId || 'ws-hr'}`
}

function isChatMessage(value) {
  if (!value || typeof value !== 'object') return false
  if (typeof value.id !== 'string' || !value.id) return false
  if (typeof value.role !== 'string' || !VALID_ROLES.has(value.role)) return false
  if (typeof value.model !== 'string' || !VALID_MODELS.has(value.model)) return false
  if (typeof value.routeReason !== 'string') return false
  if (typeof value.latencyMs !== 'number') return false
  if (typeof value.createdAt !== 'string') return false
  if (!Array.isArray(value.sources)) return false
  return true
}

function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return []
  return raw.filter(isChatMessage)
}

function trimMessages(messages) {
  if (messages.length <= CHAT_HISTORY_LIMIT) return messages
  return messages.slice(messages.length - CHAT_HISTORY_LIMIT)
}

function loadChatHistory(workspaceId = 'ws-hr') {
  try {
    const raw = localStorage.getItem(chatStorageKey(workspaceId))
    if (!raw) return []
    return trimMessages(normalizeMessages(JSON.parse(raw)))
  } catch {
    return []
  }
}

function saveChatHistory(workspaceId, messages) {
  const trimmed = trimMessages(normalizeMessages(messages))
  localStorage.setItem(chatStorageKey(workspaceId || 'ws-hr'), JSON.stringify(trimmed))
  return trimmed
}

const sample = [
  {
    id: 'u-1',
    role: 'user',
    question: '신입 연차?',
    model: 'auto',
    sources: [],
    routeReason: 'Auto Mode',
    latencyMs: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'a-1',
    role: 'assistant',
    answer: '1개월 개근 후 사용 가능',
    model: 'gpt',
    sources: ['Leave_FAQ.txt'],
    routeReason: 'Auto deliberate',
    latencyMs: 100,
    createdAt: new Date().toISOString(),
    mode: 'docs',
  },
]

saveChatHistory('ws-hr', sample)
const afterLeave = loadChatHistory('ws-hr')

saveChatHistory('ws-legal', [
  {
    id: 'u-2',
    role: 'user',
    question: '계약서 검토',
    model: 'claude',
    sources: [],
    routeReason: 'manual',
    latencyMs: 0,
    createdAt: new Date().toISOString(),
  },
])

const hrAgain = loadChatHistory('ws-hr')
const legal = loadChatHistory('ws-legal')

localStorage.setItem('kh_chat_history:ws-hr', JSON.stringify([{ bad: true }]))
const invalidCleared = loadChatHistory('ws-hr')

const many = Array.from({ length: 90 }, (_, i) => ({
  id: `m-${i}`,
  role: i % 2 === 0 ? 'user' : 'assistant',
  question: i % 2 === 0 ? `q${i}` : undefined,
  answer: i % 2 === 1 ? `a${i}` : undefined,
  model: 'gpt',
  sources: [],
  routeReason: 't',
  latencyMs: 1,
  createdAt: new Date().toISOString(),
}))
const trimmed = saveChatHistory('ws-trim', many)
const trimmedLoad = loadChatHistory('ws-trim')

const pass =
  afterLeave.length === 2 &&
  afterLeave[0].question === '신입 연차?' &&
  hrAgain.length === 2 &&
  legal.length === 1 &&
  legal[0].question === '계약서 검토' &&
  invalidCleared.length === 0 &&
  trimmed.length === 80 &&
  trimmedLoad.length === 80 &&
  trimmedLoad[0].id === 'm-10'

console.log({
  afterLeave: afterLeave.length,
  hrAgain: hrAgain.length,
  legal: legal.length,
  invalidCleared: invalidCleared.length,
  trimmed: trimmed.length,
  firstTrimmedId: trimmedLoad[0]?.id,
  PASS: pass,
})

process.exit(pass ? 0 : 1)
