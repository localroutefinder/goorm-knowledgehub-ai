import { mockUser } from '@/services/mockData'
import type { User } from '@/types'

const AUTH_KEY = 'kh_auth_user'

export async function loginWithGoogle(): Promise<User> {
  await delay(400)
  localStorage.setItem(AUTH_KEY, JSON.stringify(mockUser))
  return mockUser
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY)
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(AUTH_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
