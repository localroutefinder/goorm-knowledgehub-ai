import { randomUUID } from 'crypto'
import { getPool } from '../db.js'
import { mockWorkspaces } from './workspaceBudgets.js'

export type UsageKind = 'chat' | 'embed' | 'orchestrate'
export type UsageModel = 'gpt' | 'claude' | 'gemini' | 'perplexity' | 'embedding'

/** Approximate USD per 1K tokens (blended in/out). */
const COST_PER_1K: Record<UsageModel, number> = {
  gpt: 0.00045,
  claude: 0.0012,
  gemini: 0.0002,
  perplexity: 0.001,
  embedding: 0.00002,
}

export function estimateTokens(...parts: string[]): number {
  const chars = parts.join('').length
  return Math.max(1, Math.ceil(chars / 4))
}

export function estimateCost(model: UsageModel, tokens: number): number {
  return (tokens / 1000) * COST_PER_1K[model]
}

export interface UsageLogInput {
  workspaceId: string
  userId?: string
  model: UsageModel
  tokens: number
  cost?: number
  fallbackUsed?: boolean
  kind: UsageKind
  question?: string
}

export async function recordUsage(input: UsageLogInput): Promise<void> {
  const db = getPool()
  const cost = input.cost ?? estimateCost(input.model, input.tokens)
  await db.query(
    `INSERT INTO usage_logs
      (id, workspace_id, user_id, model, tokens, cost, fallback_used, kind, question)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      randomUUID(),
      input.workspaceId,
      input.userId ?? 'local-user',
      input.model,
      input.tokens,
      cost,
      Boolean(input.fallbackUsed),
      input.kind,
      input.question ?? null,
    ],
  )
}

export function getBudgetLimit(workspaceId?: string): number {
  if (workspaceId) {
    const ws = mockWorkspaces.find((w) => w.id === workspaceId)
    return ws?.budgetLimit ?? 500
  }
  return mockWorkspaces.reduce((sum, w) => sum + w.budgetLimit, 0)
}

export async function getUsageSummary(workspaceId?: string) {
  const db = getPool()
  const params: string[] = []
  let where = `created_at >= date_trunc('month', NOW())`
  if (workspaceId) {
    params.push(workspaceId)
    where += ` AND workspace_id = $1`
  }

  const { rows } = await db.query<{
    budget_used: string
    monthly_queries: string
    total_tokens: string
  }>(
    `SELECT
       COALESCE(SUM(cost), 0)::float8 AS budget_used,
       COALESCE(SUM(CASE WHEN kind = 'chat' THEN 1 ELSE 0 END), 0)::int AS monthly_queries,
       COALESCE(SUM(tokens), 0)::int AS total_tokens
     FROM usage_logs
     WHERE ${where}`,
    params,
  )

  const recentParams: string[] = []
  let recentWhere = `kind = 'chat' AND question IS NOT NULL`
  if (workspaceId) {
    recentParams.push(workspaceId)
    recentWhere += ` AND workspace_id = $1`
  }

  const recent = await db.query<{
    id: string
    question: string
    created_at: string
    model: string
  }>(
    `SELECT id, question, created_at, model
     FROM usage_logs
     WHERE ${recentWhere}
     ORDER BY created_at DESC
     LIMIT 5`,
    recentParams,
  )

  const budgetUsed = Number(rows[0]?.budget_used ?? 0)
  const budgetLimit = getBudgetLimit(workspaceId)

  return {
    budgetUsed,
    budgetLimit,
    monthlyQueries: Number(rows[0]?.monthly_queries ?? 0),
    totalTokens: Number(rows[0]?.total_tokens ?? 0),
    recentQuestions: recent.rows.map((r) => ({
      id: r.id,
      question: r.question,
      createdAt: r.created_at,
      model: r.model,
    })),
  }
}
