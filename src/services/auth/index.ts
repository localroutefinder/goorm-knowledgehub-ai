import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '@/services/firebase/app'
import { mockUser } from '@/services/mockData'
import type { User } from '@/types'

const AUTH_KEY = 'kh_auth_user'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mapFirebaseUser(fb: FirebaseUser): User {
  return {
    id: fb.uid,
    name: fb.displayName?.trim() || fb.email?.split('@')[0] || 'User',
    email: fb.email ?? '',
    photoURL: fb.photoURL ?? '',
    role: 'member',
    createdAt: fb.metadata.creationTime
      ? new Date(fb.metadata.creationTime).toISOString()
      : new Date().toISOString(),
  }
}

function saveMockUser(user: User) {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user))
  } catch {
    // ignore
  }
}

function clearMockUser() {
  try {
    localStorage.removeItem(AUTH_KEY)
  } catch {
    // ignore
  }
}

export function getCurrentUser(): User | null {
  if (isFirebaseConfigured()) {
    const auth = getFirebaseAuth()
    return auth?.currentUser ? mapFirebaseUser(auth.currentUser) : null
  }

  const raw = localStorage.getItem(AUTH_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export async function loginWithGoogle(): Promise<User> {
  if (!isFirebaseConfigured()) {
    await delay(400)
    saveMockUser(mockUser)
    return mockUser
  }

  const auth = getFirebaseAuth()
  if (!auth) {
    throw new Error('Firebase Auth is not initialized')
  }

  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(auth, provider)
  clearMockUser()
  return mapFirebaseUser(result.user)
}

export async function logout(): Promise<void> {
  clearMockUser()
  const auth = getFirebaseAuth()
  if (auth) {
    await signOut(auth)
  }
}

/** Subscribe to auth state. Returns unsubscribe. */
export function subscribeAuth(onChange: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured()) {
    onChange(getCurrentUser())
    return () => undefined
  }

  const auth = getFirebaseAuth()
  if (!auth) {
    onChange(null)
    return () => undefined
  }

  return onAuthStateChanged(auth, (fb) => {
    onChange(fb ? mapFirebaseUser(fb) : null)
  })
}

export { isFirebaseConfigured }
