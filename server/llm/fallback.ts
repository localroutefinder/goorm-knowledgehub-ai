import { runDeliberation } from './deliberate.js'
import { callProvider } from './providers.js'
import { routeModel } from './router.js'
import {
  hasProviderKey,
  type LlmResult,
  type PromptMode,
  type ProviderModel,
  type RequestedModel,
} from './types.js'

export const FALLBACK_ORDER: ProviderModel[] = [
  'gpt',
  'claude',
  'gemini',
  'perplexity',
]

export async function runWithFallback(
  question: string,
  requested: RequestedModel,
  options: {
    ragContext?: string
    sources?: string[]
    mode?: PromptMode
    ragWeak?: boolean
  } = {},
): Promise<LlmResult> {
  if (requested === 'auto') {
    return runDeliberation(question, options)
  }

  const mode: PromptMode =
    options.mode ??
    (requested === 'perplexity' ? 'web' : options.ragWeak ? 'hybrid' : 'docs')

  const sources = options.sources ?? []
  const started = Date.now()
  const errors: string[] = []

  const decision = routeModel(question, requested, {
    ragWeak: options.ragWeak,
    preferWeb: mode === 'web' || requested === 'perplexity',
  })
  const primary = decision.model
  const baseReason = decision.reason
  const chain = buildChain(primary)

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]
    if (!hasProviderKey(model)) {
      errors.push(`${model}: missing API key`)
      continue
    }

    try {
      const answer = await callProvider(model, question, options.ragContext, mode)
      const modeNote = ` · mode=${mode}`
      const ragNote =
        sources.length > 0
          ? ` · RAG sources=${sources.length}`
          : options.ragWeak
            ? ' · RAG weak → general/web'
            : ' · RAG none'
      return {
        answer,
        model,
        mode,
        routeReason:
          i === 0
            ? `${baseReason}${modeNote}${ragNote}`
            : `${baseReason}${modeNote}${ragNote} · Fallback → ${model.toUpperCase()} (${errors.join('; ')})`,
        latencyMs: Date.now() - started,
        fallbackUsed: i > 0,
        sources,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`${model}: ${message}`)
    }
  }

  throw new Error(
    `모든 LLM 호출에 실패했습니다. ${errors.join(' | ') || '사용 가능한 API 키가 없습니다.'}`,
  )
}

function buildChain(primary: ProviderModel): ProviderModel[] {
  const rest = FALLBACK_ORDER.filter((m) => m !== primary)
  return [primary, ...rest]
}
