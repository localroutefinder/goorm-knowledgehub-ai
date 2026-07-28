import { getPool } from '../db.js'

export const GUEST_CHAT_LIMIT = 3

export type GuestQuotaStatus = {
  mode: 'guest' | 'authenticated'
  limit: number
  used: number
  remaining: number | null
}

export function isValidGuestId(value: string | undefined | null): value is string {
  if (!value) return false
  const id = value.trim()
  // UUID-ish or opaque token 8–128 chars
  return id.length >= 8 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id)
}

export async function getGuestQuota(guestId: string): Promise<GuestQuotaStatus> {
  const db = getPool()
  const { rows } = await db.query<{ chat_count: number }>(
    `SELECT chat_count FROM guest_chat_quota WHERE guest_id = $1`,
    [guestId],
  )
  const used = Number(rows[0]?.chat_count ?? 0)
  return {
    mode: 'guest',
    limit: GUEST_CHAT_LIMIT,
    used,
    remaining: Math.max(0, GUEST_CHAT_LIMIT - used),
  }
}

export function authenticatedQuota(): GuestQuotaStatus {
  return {
    mode: 'authenticated',
    limit: GUEST_CHAT_LIMIT,
    used: 0,
    remaining: null,
  }
}

/** Throws if guest already at limit. Does not increment. */
export async function assertGuestCanChat(guestId: string): Promise<GuestQuotaStatus> {
  const status = await getGuestQuota(guestId)
  if ((status.remaining ?? 0) <= 0) {
    const err = new Error('게스트 체험 한도(3회)를 모두 사용했습니다.') as Error & {
      code?: string
      status?: GuestQuotaStatus
    }
    err.code = 'GUEST_LIMIT'
    err.status = status
    throw err
  }
  return status
}

/** Increment after successful chat. Returns updated status. */
export async function incrementGuestChat(
  guestId: string,
  ip?: string | null,
): Promise<GuestQuotaStatus> {
  const db = getPool()
  await db.query(
    `INSERT INTO guest_chat_quota (guest_id, chat_count, last_ip, updated_at)
     VALUES ($1, 1, $2, NOW())
     ON CONFLICT (guest_id) DO UPDATE SET
       chat_count = guest_chat_quota.chat_count + 1,
       last_ip = COALESCE($2, guest_chat_quota.last_ip),
       updated_at = NOW()`,
    [guestId, ip ?? null],
  )
  return getGuestQuota(guestId)
}
