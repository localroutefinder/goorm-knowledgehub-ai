import { getPool } from '../db.js'

export async function getAnalytics(workspaceId?: string) {
  const db = getPool()
  const params: string[] = []
  let whereMonth = `created_at >= date_trunc('month', NOW())`
  if (workspaceId) {
    params.push(workspaceId)
    whereMonth += ` AND workspace_id = $1`
  }

  const byModel = await db.query<{
    model: string
    requests: string
    tokens: string
    cost: string
    fallbacks: string
  }>(
    `SELECT model,
            COUNT(*)::int AS requests,
            COALESCE(SUM(tokens),0)::int AS tokens,
            COALESCE(SUM(cost),0)::float8 AS cost,
            COALESCE(SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END),0)::int AS fallbacks
     FROM usage_logs
     WHERE ${whereMonth}
     GROUP BY model
     ORDER BY cost DESC`,
    params,
  )

  const throughput = await db.query<{ hour: string; count: string }>(
    `SELECT to_char(date_trunc('hour', created_at), 'HH24') AS hour,
            COUNT(*)::int AS count
     FROM usage_logs
     WHERE created_at >= NOW() - INTERVAL '12 hours'
       ${workspaceId ? 'AND workspace_id = $1' : ''}
     GROUP BY 1
     ORDER BY 1`,
    params,
  )

  const events = await db.query<{
    id: string
    model: string
    kind: string
    fallback_used: boolean
    question: string | null
    cost: number
    tokens: number
    created_at: string
  }>(
    `SELECT id, model, kind, fallback_used, question, cost, tokens, created_at
     FROM usage_logs
     WHERE ${whereMonth}
     ORDER BY created_at DESC
     LIMIT 20`,
    params,
  )

  const totals = await db.query<{
    cost: string
    requests: string
    tokens: string
  }>(
    `SELECT COALESCE(SUM(cost),0)::float8 AS cost,
            COUNT(*)::int AS requests,
            COALESCE(SUM(tokens),0)::int AS tokens
     FROM usage_logs
     WHERE ${whereMonth}`,
    params,
  )

  const hourMap = new Map(throughput.rows.map((r) => [r.hour, Number(r.count)]))
  const series = Array.from({ length: 12 }, (_, i) => {
    const h = String((new Date().getHours() - 11 + i + 24) % 24).padStart(2, '0')
    return hourMap.get(h) ?? 0
  })

  const modelHealth = ['gpt', 'claude', 'gemini', 'perplexity'].map((model) => {
    const row = byModel.rows.find((r) => r.model === model)
    const fallbacks = Number(row?.fallbacks ?? 0)
    const requests = Number(row?.requests ?? 0)
    return {
      model,
      label: model.toUpperCase(),
      status: fallbacks > 0 && requests > 0 ? 'degraded' : 'operational',
      latencyMs: 0,
      requests,
      cost: Number(row?.cost ?? 0),
    }
  })

  return {
    totals: {
      cost: Number(totals.rows[0]?.cost ?? 0),
      requests: Number(totals.rows[0]?.requests ?? 0),
      tokens: Number(totals.rows[0]?.tokens ?? 0),
    },
    byModel: byModel.rows.map((r) => ({
      model: r.model,
      requests: Number(r.requests),
      tokens: Number(r.tokens),
      cost: Number(r.cost),
      fallbacks: Number(r.fallbacks),
    })),
    throughput: series,
    modelHealth,
    kernelEvents: events.rows.map((e) => ({
      id: e.id,
      level: e.fallback_used ? 'warn' : e.kind === 'embed' ? 'info' : 'info',
      message: e.question
        ? `${e.model}/${e.kind}: ${e.question.slice(0, 80)}${e.fallback_used ? ' (fallback)' : ''}`
        : `${e.model}/${e.kind} · $${Number(e.cost).toFixed(4)}${e.fallback_used ? ' (fallback)' : ''}`,
      createdAt: e.created_at,
    })),
    usageLogs: events.rows
      .filter((e) => e.kind === 'chat')
      .slice(0, 10)
      .map((e) => ({
        id: e.id,
        workspaceId: workspaceId ?? 'all',
        userId: 'local-user',
        model: e.model,
        tokens: Number(e.tokens),
        cost: Number(e.cost),
        fallbackUsed: e.fallback_used,
        createdAt: e.created_at,
      })),
  }
}
