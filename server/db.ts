import pg from 'pg'

const { Pool } = pg

let pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (pool) return pool
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing')
  }
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  return pool
}

export async function ensureSchema(): Promise<void> {
  const db = getPool()
  await db.query('CREATE EXTENSION IF NOT EXISTS vector')

  await db.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      type TEXT NOT NULL,
      access_level TEXT NOT NULL DEFAULT 'workspace',
      content TEXT NOT NULL,
      uploaded_by TEXT,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'indexed'
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL,
      chunk_index INT NOT NULL,
      content TEXT NOT NULL,
      embedding vector(1536),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS document_chunks_workspace_idx
      ON document_chunks (workspace_id)
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
      ON document_chunks
      USING hnsw (embedding vector_cosine_ops)
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'local-user',
      model TEXT NOT NULL,
      tokens INT NOT NULL DEFAULT 0,
      cost DOUBLE PRECISION NOT NULL DEFAULT 0,
      fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
      kind TEXT NOT NULL DEFAULT 'chat',
      question TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS usage_logs_workspace_created_idx
      ON usage_logs (workspace_id, created_at DESC)
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS usage_logs_created_idx
      ON usage_logs (created_at DESC)
  `)
}
