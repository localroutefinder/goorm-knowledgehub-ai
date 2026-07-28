import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const REQUIRED_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

function readEnv(key: (typeof REQUIRED_KEYS)[number]): string {
  return String(import.meta.env[key] ?? '').trim()
}

export function isFirebaseConfigured(): boolean {
  return REQUIRED_KEYS.every((key) => Boolean(readEnv(key)))
}

let app: FirebaseApp | null = null
let auth: Auth | null = null

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null
  if (!app) {
    app = initializeApp({
      apiKey: readEnv('VITE_FIREBASE_API_KEY'),
      authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
      projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
      storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
      appId: readEnv('VITE_FIREBASE_APP_ID'),
      ...(import.meta.env.VITE_FIREBASE_DATABASE_URL?.trim()
        ? { databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL.trim() }
        : {}),
    })
  }
  return app
}

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null
  if (!auth) {
    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) return null
    auth = getAuth(firebaseApp)
  }
  return auth
}
