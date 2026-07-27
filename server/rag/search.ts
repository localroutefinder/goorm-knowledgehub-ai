import { getPool } from '../db.js'
import { embedQuery, toVectorLiteral } from './embeddings.js'

export interface SearchHit {
  documentId: string
  filename: string
  content: string
  score: number
  workspaceId: string
}

export async function searchDocuments(
  question: string,
  options: { workspaceId?: string; topK?: number } = {},
): Promise<SearchHit[]> {
  const topK = options.topK ?? 5
  const embedding = await embedQuery(question, {
    workspaceId: options.workspaceId ?? 'ws-hr',
  })
  const vector = toVectorLiteral(embedding)
  const db = getPool()

  if (options.workspaceId) {
    const { rows } = await db.query<{
      document_id: string
      filename: string
      content: string
      workspace_id: string
      score: number
    }>(
      `SELECT c.document_id, d.filename, c.content, c.workspace_id,
              1 - (c.embedding <=> $1::vector) AS score
       FROM document_chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.workspace_id = $2
       ORDER BY c.embedding <=> $1::vector
       LIMIT $3`,
      [vector, options.workspaceId, topK],
    )
    return rows.map((r) => ({
      documentId: r.document_id,
      filename: r.filename,
      content: r.content,
      workspaceId: r.workspace_id,
      score: Number(r.score),
    }))
  }

  const { rows } = await db.query<{
    document_id: string
    filename: string
    content: string
    workspace_id: string
    score: number
  }>(
    `SELECT c.document_id, d.filename, c.content, c.workspace_id,
            1 - (c.embedding <=> $1::vector) AS score
     FROM document_chunks c
     JOIN documents d ON d.id = c.document_id
     ORDER BY c.embedding <=> $1::vector
     LIMIT $2`,
    [vector, topK],
  )

  return rows.map((r) => ({
    documentId: r.document_id,
    filename: r.filename,
    content: r.content,
    workspaceId: r.workspace_id,
    score: Number(r.score),
  }))
}

export function buildRagContext(hits: SearchHit[]): {
  context: string
  sources: string[]
} {
  if (hits.length === 0) {
    return { context: '', sources: [] }
  }

  const sources = [...new Set(hits.map((h) => h.filename))]
  const context = hits
    .map(
      (h, i) =>
        `[출처 ${i + 1}: ${h.filename} | score=${h.score.toFixed(3)}]\n${h.content}`,
    )
    .join('\n\n---\n\n')

  return { context, sources }
}

/** Cosine similarity gate. Calibrated on seed HR docs (~0.40+ for leave Qs, ~0.22 for off-topic). */
export const RAG_SCORE_THRESHOLD = 0.38

export function topScore(hits: SearchHit[]): number {
  if (hits.length === 0) return 0
  return Math.max(...hits.map((h) => h.score))
}

export function isRelevant(
  hits: SearchHit[],
  threshold = RAG_SCORE_THRESHOLD,
): boolean {
  return topScore(hits) >= threshold
}

export function filterRelevantHits(
  hits: SearchHit[],
  threshold = RAG_SCORE_THRESHOLD,
): SearchHit[] {
  return hits.filter((h) => h.score >= threshold)
}
