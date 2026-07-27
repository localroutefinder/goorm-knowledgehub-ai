import './loadEnv.js'
import cors from 'cors'
import express from 'express'
import { ensureSchema } from './db.js'
import { runWithFallback } from './llm/fallback.js'
import type { PromptMode, ProviderModel, RequestedModel } from './llm/types.js'
import { indexDocument, listDocuments } from './rag/indexDocument.js'
import {
  buildRagContext,
  filterRelevantHits,
  isRelevant,
  searchDocuments,
  topScore,
} from './rag/search.js'
import { estimateTokens, getUsageSummary, recordUsage } from './usage/usage.js'

const app = express()
const PORT = Number(process.env.API_PORT || 8787)

app.use(cors())
app.use(express.json({ limit: '5mb' }))

app.get('/api/health', async (_req, res) => {
  let db = false
  try {
    await ensureSchema()
    db = true
  } catch (err) {
    console.error('[health/db]', err)
  }

  res.json({
    ok: true,
    db,
    providers: {
      gpt: Boolean(process.env.OPENAI_API_KEY?.trim()),
      claude: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      gemini: Boolean(process.env.GOOGLE_API_KEY?.trim()),
      perplexity: Boolean(process.env.PERPLEXITY_API_KEY?.trim()),
    },
  })
})

app.get('/api/usage/summary', async (req, res) => {
  try {
    await ensureSchema()
    const workspaceId = req.query.workspaceId
      ? String(req.query.workspaceId)
      : undefined
    const summary = await getUsageSummary(workspaceId)
    res.json(summary)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/usage/summary]', message)
    res.status(500).json({ error: message })
  }
})

app.get('/api/usage/analytics', async (req, res) => {
  try {
    await ensureSchema()
    const workspaceId = req.query.workspaceId
      ? String(req.query.workspaceId)
      : undefined
    const { getAnalytics } = await import('./usage/analytics.js')
    const analytics = await getAnalytics(workspaceId)
    res.json(analytics)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/usage/analytics]', message)
    res.status(500).json({ error: message })
  }
})

app.get('/api/documents', async (req, res) => {
  try {
    await ensureSchema()
    const workspaceId = req.query.workspaceId
      ? String(req.query.workspaceId)
      : undefined
    const rows = await listDocuments(workspaceId)
    res.json({
      documents: rows.map((r) => ({
        id: r.id,
        workspaceId: r.workspace_id,
        filename: r.filename,
        type: r.type,
        accessLevel: r.access_level,
        uploadedBy: r.uploaded_by,
        uploadedAt: r.uploaded_at,
        status: r.status,
        sizeLabel: `${Math.max(1, Math.round(Number(r.content_length) / 1024))} KB`,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/documents]', message)
    res.status(500).json({ error: message })
  }
})

app.post('/api/documents/upload', async (req, res) => {
  try {
    await ensureSchema()
    const workspaceId = String(req.body?.workspaceId ?? 'ws-hr').trim()
    const filename = String(req.body?.filename ?? 'untitled.txt').trim()
    const content = String(req.body?.content ?? '')
    const typeRaw = String(req.body?.type ?? 'txt').toLowerCase()
    const type = (['pdf', 'md', 'txt'].includes(typeRaw) ? typeRaw : 'txt') as
      | 'pdf'
      | 'md'
      | 'txt'
    const accessLevel = String(req.body?.accessLevel ?? 'workspace') as
      | 'public'
      | 'workspace'
      | 'restricted'
    const uploadedBy = String(req.body?.uploadedBy ?? 'user')

    if (!content.trim()) {
      res.status(400).json({ error: 'content is required' })
      return
    }

    const doc = await indexDocument({
      workspaceId,
      filename,
      type,
      content,
      accessLevel,
      uploadedBy,
    })

    res.json({ document: doc })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/documents/upload]', message)
    res.status(500).json({ error: message })
  }
})

app.post('/api/search', async (req, res) => {
  try {
    await ensureSchema()
    const question = String(req.body?.question ?? '').trim()
    const workspaceId = req.body?.workspaceId
      ? String(req.body.workspaceId)
      : undefined
    const topK = Number(req.body?.topK ?? 5)

    if (!question) {
      res.status(400).json({ error: 'question is required' })
      return
    }

    const hits = await searchDocuments(question, { workspaceId, topK })
    res.json({ hits })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/search]', message)
    res.status(500).json({ error: message })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const question = String(req.body?.question ?? '').trim()
    const model = String(req.body?.model ?? 'auto') as RequestedModel
    const workspaceId = req.body?.workspaceId
      ? String(req.body.workspaceId)
      : 'ws-hr'

    if (!question) {
      res.status(400).json({ error: 'question is required' })
      return
    }

    const allowed = new Set(['gpt', 'claude', 'gemini', 'perplexity', 'auto'])
    if (!allowed.has(model)) {
      res.status(400).json({ error: 'invalid model' })
      return
    }

    let sources: string[] = []
    let ragContext = ''
    let ragWeak = true
    let mode: PromptMode =
      model === 'perplexity' ? 'web' : 'hybrid'

    try {
      await ensureSchema()
      const hits = await searchDocuments(question, { workspaceId, topK: 5 })
      const score = topScore(hits)
      ragWeak = !isRelevant(hits)

      if (model === 'perplexity') {
        mode = 'web'
        // Perplexity: RAG는 보조만 — 관련 hit만 참고로 전달
        const relevant = filterRelevantHits(hits)
        const built = buildRagContext(relevant.length > 0 ? relevant : [])
        sources = built.sources
        ragContext = built.context
      } else if (!ragWeak) {
        mode = 'docs'
        const relevant = filterRelevantHits(hits)
        const built = buildRagContext(relevant)
        sources = built.sources
        ragContext = built.context
      } else {
        mode = 'hybrid'
        // 약한 매칭은 컨텍스트 주입 안 함 → 문서 거절 방지
        sources = []
        ragContext = ''
        console.log(
          `[api/chat] RAG weak (topScore=${score.toFixed(3)}) → hybrid/general`,
        )
      }
    } catch (err) {
      console.warn('[api/chat] RAG unavailable, continuing without context', err)
      ragWeak = true
      mode = model === 'perplexity' ? 'web' : 'hybrid'
    }

    const result = await runWithFallback(question, model, {
      ragContext,
      sources,
      mode,
      ragWeak,
    })

    try {
      if (result.deliberation?.length) {
        for (const step of result.deliberation) {
          const tokens = estimateTokens(question, step.content)
          await recordUsage({
            workspaceId,
            model: step.model,
            tokens,
            fallbackUsed: false,
            kind: step.role === 'chair' ? 'orchestrate' : 'chat',
            question:
              step.role === 'chair'
                ? `[deliberate/chair] ${question}`
                : `[deliberate/draft/${step.model}] ${question}`,
          })
        }
      } else {
        if (result.orchestration?.orchestratorModel) {
          const orchTokens = estimateTokens(
            question,
            `orchestrate:${result.orchestration.intent}:${result.orchestration.reason}`,
          )
          await recordUsage({
            workspaceId,
            model: result.orchestration.orchestratorModel,
            tokens: orchTokens,
            fallbackUsed: false,
            kind: 'orchestrate',
            question: `[orchestrate] ${question}`,
          })
        }

        const tokens = estimateTokens(question, ragContext, result.answer)
        await recordUsage({
          workspaceId,
          model: result.model as ProviderModel,
          tokens,
          fallbackUsed: result.fallbackUsed,
          kind: 'chat',
          question,
        })
      }
    } catch (err) {
      console.warn('[api/chat] usage log failed', err)
    }

    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/chat]', message)
    res.status(502).json({ error: message })
  }
})

async function boot() {
  try {
    await ensureSchema()
    console.log('[api] Neon schema ready')
  } catch (err) {
    console.warn('[api] Neon schema init failed (RAG will retry on request)', err)
  }

  app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`)
  })
}

void boot()
