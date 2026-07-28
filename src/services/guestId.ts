const GUEST_ID_KEY = 'kh_guest_id'

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

/** Stable anonymous guest id for quota (localStorage). */
export function getOrCreateGuestId(): string {
  try {
    const existing = localStorage.getItem(GUEST_ID_KEY)?.trim()
    if (existing && existing.length >= 8) return existing
    const id = randomId()
    localStorage.setItem(GUEST_ID_KEY, id)
    return id
  } catch {
    return randomId()
  }
}

export const GUEST_WORKSPACE_ID = 'guest'
export const GUEST_CHAT_LIMIT = 3
