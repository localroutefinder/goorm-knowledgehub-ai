import { orchestrate } from './orchestrator.js'
import { callProvider } from './providers.js'
import {
  hasProviderKey,
  normalizeGenerationOptions,
  type DeliberationStep,
  type GenerationOptions,
  type LlmResult,
  type PromptMode,
  type ProviderModel,
} from './types.js'

const DRAFT_POOL: ProviderModel[] = ['gpt', 'claude', 'gemini']
const WEB_DRAFT_POOL: ProviderModel[] = ['gpt', 'claude', 'gemini', 'perplexity']

function mergeSources(base: string[], citations?: string[]): string[] {
  const seen = new Set(base)
  const out = [...base]
  for (const c of citations ?? []) {
    const t = c.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export async function runDeliberation(
  question: string,
  options: {
    ragContext?: string
    sources?: string[]
    mode?: PromptMode
    ragWeak?: boolean
    generation?: GenerationOptions
  } = {},
): Promise<LlmResult> {
  const generation = normalizeGenerationOptions(options.generation)
  const mode: PromptMode = options.mode ?? (options.ragWeak ? 'hybrid' : 'docs')
  let sources = options.sources ?? []
  const started = Date.now()
  const pool = (mode === 'web' ? WEB_DRAFT_POOL : DRAFT_POOL).filter((m) =>
    hasProviderKey(m),
  )

  if (pool.length === 0) {
    throw new Error('사용 가능한 API 키가 없습니다.')
  }

  const modeNote = ` · mode=${mode}`
  const ragNote = () =>
    sources.length > 0
      ? ` · sources=${sources.length}`
      : options.ragWeak
        ? ' · RAG weak → general/web'
        : ' · RAG none'

  // Single model: no multi-party deliberation
  if (pool.length === 1) {
    const model = pool[0]
    const result = await callProvider(
      model,
      question,
      options.ragContext,
      mode,
      generation,
    )
    sources = mergeSources(sources, result.citations)
    const step: DeliberationStep = {
      round: 1,
      model,
      role: 'draft',
      content: result.answer,
    }
    return {
      answer: result.answer,
      model,
      mode,
      sources,
      fallbackUsed: false,
      latencyMs: Date.now() - started,
      routeReason: `Auto deliberate · 단독 응답 (${model.toUpperCase()})${modeNote}${ragNote()}`,
      deliberation: [step],
      generation,
    }
  }

  const participants = pool.slice(0, 3)
  const draftResults = await Promise.all(
    participants.map(async (model) => {
      try {
        const result = await callProvider(
          model,
          question,
          options.ragContext,
          mode,
          generation,
        )
        return {
          model,
          content: result.answer,
          citations: result.citations,
          error: null as string | null,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          model,
          content: '',
          citations: undefined as string[] | undefined,
          error: message,
        }
      }
    }),
  )

  const drafts = draftResults.filter((d) => !d.error && d.content.trim())
  const draftErrors = draftResults
    .filter((d) => d.error)
    .map((d) => `${d.model}: ${d.error}`)

  for (const d of drafts) {
    sources = mergeSources(sources, d.citations)
  }

  if (drafts.length === 0) {
    throw new Error(
      `협의 초안 수집 실패. ${draftErrors.join(' | ') || '알 수 없는 오류'}`,
    )
  }

  const deliberation: DeliberationStep[] = drafts.map((d) => ({
    round: 1,
    model: d.model,
    role: 'draft',
    content: d.content,
  }))

  if (drafts.length === 1) {
    const only = drafts[0]
    return {
      answer: only.content,
      model: only.model,
      mode,
      sources,
      fallbackUsed: false,
      latencyMs: Date.now() - started,
      routeReason: `Auto deliberate · 초안 1건만 성공 (${only.model.toUpperCase()})${modeNote}${ragNote()}`,
      deliberation,
      generation,
    }
  }

  const orch = await orchestrate(question, {
    mode,
    ragWeak: options.ragWeak,
    hasSources: sources.length > 0,
  })
  let chair = orch.preferredModel
  if (!hasProviderKey(chair)) {
    chair =
      drafts.find((d) => hasProviderKey(d.model))?.model ??
      DRAFT_POOL.find((m) => hasProviderKey(m)) ??
      drafts[0].model
  }

  const draftBlock = drafts
    .map(
      (d, i) =>
        `[초안 ${i + 1} · ${d.model.toUpperCase()}]\n${d.content.trim()}`,
    )
    .join('\n\n---\n\n')

  const chairQuestion = `여러 LLM 초안을 비교·합의해 최종 답변을 작성하세요.

사용자 질문:
${question}

초안들:
${draftBlock}

반드시 아래 형식으로만 답하세요:
### 일치
- (모델들이 동의한 핵심)

### 불일치/보완
- (차이점 또는 보완할 점)

### 최종답변
(사용자에게 보여줄 완성된 한국어 답변. 이 섹션만 실무 답으로 사용됩니다.)`

  let chairRaw: string
  try {
    const synthHint = `${options.ragContext?.trim() ? `${options.ragContext.trim()}\n\n` : ''}당신은 멀티 LLM 협의의 의장(Chair)입니다. 초안의 공통점과 차이를 정리하고 최종 답변을 확정하세요.`
    const chairResult = await callProvider(
      chair,
      chairQuestion,
      synthHint,
      mode,
      generation,
    )
    chairRaw = chairResult.answer
    sources = mergeSources(sources, chairResult.citations)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const fallback = drafts[0]
    deliberation.push({
      round: 2,
      model: chair,
      role: 'chair',
      content: `합의 합성 실패 (${message}). 첫 초안을 채택합니다.`,
    })
    return {
      answer: fallback.content,
      model: fallback.model,
      mode,
      sources,
      fallbackUsed: true,
      latencyMs: Date.now() - started,
      orchestration: orch,
      routeReason: `Auto deliberate → chair 실패 · draft ${fallback.model.toUpperCase()} 채택${modeNote}${ragNote()}`,
      deliberation,
      generation,
    }
  }

  const { agreement, dissent, finalAnswer } = parseChairOutput(chairRaw)
  const chairDisplay = [
    agreement ? `### 일치\n${agreement}` : '',
    dissent ? `### 불일치/보완\n${dissent}` : '',
    `### 최종답변\n${finalAnswer}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  deliberation.push({
    round: 2,
    model: chair,
    role: 'chair',
    content: chairDisplay,
  })

  const names = drafts.map((d) => d.model.toUpperCase()).join('+')
  return {
    answer: finalAnswer,
    model: chair,
    mode,
    sources,
    fallbackUsed: false,
    latencyMs: Date.now() - started,
    orchestration: orch,
    routeReason: `Auto deliberate · Round1=${names} → Chair ${chair.toUpperCase()} (intent=${orch.intent})${modeNote}${ragNote()}`,
    deliberation,
    generation,
  }
}

function parseChairOutput(raw: string): {
  agreement: string
  dissent: string
  finalAnswer: string
} {
  const text = raw.trim()
  const finalMatch = text.match(
    /###\s*최종답변\s*\n([\s\S]*?)(?=\n###\s|$)/i,
  )
  const agreeMatch = text.match(/###\s*일치\s*\n([\s\S]*?)(?=\n###\s|$)/i)
  const dissentMatch = text.match(
    /###\s*불일치\/?보완\s*\n([\s\S]*?)(?=\n###\s|$)/i,
  )

  const finalAnswer = (finalMatch?.[1] ?? text).trim()
  return {
    agreement: (agreeMatch?.[1] ?? '').trim(),
    dissent: (dissentMatch?.[1] ?? '').trim(),
    finalAnswer: finalAnswer || text,
  }
}
