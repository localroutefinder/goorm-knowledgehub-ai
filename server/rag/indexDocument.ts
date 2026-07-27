import { randomUUID } from 'crypto'
import { getPool } from '../db.js'
import { chunkText } from './chunk.js'
import { embedTexts, toVectorLiteral } from './embeddings.js'

export interface IndexDocumentInput {
  id?: string
  workspaceId: string
  filename: string
  type: 'pdf' | 'md' | 'txt'
  content: string
  accessLevel?: 'public' | 'workspace' | 'restricted'
  uploadedBy?: string
}

export interface IndexedDocument {
  id: string
  workspaceId: string
  filename: string
  type: string
  chunkCount: number
  status: string
}

export async function indexDocument(input: IndexDocumentInput): Promise<IndexedDocument> {
  const db = getPool()
  const id = input.id ?? randomUUID()
  const chunks = chunkText(input.content)
  if (chunks.length === 0) {
    throw new Error('Document content is empty')
  }

  const embeddings = await embedTexts(chunks, {
    workspaceId: input.workspaceId,
    log: true,
  })

  await db.query('BEGIN')
  try {
    await db.query(`DELETE FROM documents WHERE id = $1`, [id])
    await db.query(
      `INSERT INTO documents
        (id, workspace_id, filename, type, access_level, content, uploaded_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'indexed')`,
      [
        id,
        input.workspaceId,
        input.filename,
        input.type,
        input.accessLevel ?? 'workspace',
        input.content,
        input.uploadedBy ?? 'system',
      ],
    )

    for (let i = 0; i < chunks.length; i++) {
      await db.query(
        `INSERT INTO document_chunks
          (id, document_id, workspace_id, chunk_index, content, embedding)
         VALUES ($1,$2,$3,$4,$5,$6::vector)`,
        [
          randomUUID(),
          id,
          input.workspaceId,
          i,
          chunks[i],
          toVectorLiteral(embeddings[i]),
        ],
      )
    }

    await db.query('COMMIT')
  } catch (err) {
    await db.query('ROLLBACK')
    throw err
  }

  return {
    id,
    workspaceId: input.workspaceId,
    filename: input.filename,
    type: input.type,
    chunkCount: chunks.length,
    status: 'indexed',
  }
}

export async function listDocuments(workspaceId?: string) {
  const db = getPool()
  if (workspaceId) {
    const { rows } = await db.query(
      `SELECT id, workspace_id, filename, type, access_level, uploaded_by, uploaded_at, status,
              length(content) AS content_length
       FROM documents
       WHERE workspace_id = $1
       ORDER BY uploaded_at DESC`,
      [workspaceId],
    )
    return rows
  }

  const { rows } = await db.query(
    `SELECT id, workspace_id, filename, type, access_level, uploaded_by, uploaded_at, status,
            length(content) AS content_length
     FROM documents
     ORDER BY uploaded_at DESC`,
  )
  return rows
}
