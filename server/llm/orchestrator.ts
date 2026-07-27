import { routeModel } from './router.js'
import {
  hasProviderKey,
  type OrchestrationDecision,
  type OrchestrationIntent,
  type PromptMode,
  type ProviderModel,
} from './types.js'

const ORCHESTRATOR_ORDER: ProviderModel[] = ['gpt', 'gemini', 'claude']

const INTENT_FALLBACK: Record<OrchestrationIntent, ProviderModel[]> = {
  policy: ['claude', 'gpt', 'gemini', 'perplexity'],
  reasoning: ['claude', 'gpt', 'gemini', 'perplexity'],
  short_faq: ['gpt', 'gemini', 'claude', 'perplexity'],
  web_news: ['perplexity', 'gpt', 'gemini', 'claude'],
  general: ['gemini', 'gpt', 'claude', 'perplexity'],
}

const VALID_INTENTS = new Set<OrchestrationIntent>([
  'policy',
  'short_faq',
  'reasoning',
  'web_news',
  'general',
])

const VALID_MODELS = new Set<ProviderModel>([
  'gpt',
  'claude',
  'gemini',
  'perplexity',
])

const ORCH_SYSTEM = `You are a model router for Goorm KnowledgeHub AI.
Classify the user question and pick the best LLM. Reply with ONLY valid JSON (no markdown):
{"intent":"policy"|"short_faq"|"reasoning"|"web_news"|"general","preferredModel":"gpt"|"claude"|"gemini"|"perplexity","reason":"한국어 한 줄","confidence":0.0}

Rules:
- policy: HR/legal/policy/leave/payroll/internal rules
- short_faq: short factual Q&A
- reasoning: long analysis, comparison, multi-step
- web_news: latest news, search, market, weather, "today"
- general: other
- Prefer claude for policy/reasoning, gpt for short_faq, perplexity for web_news, gemini for general
- If ragMode is docs, prefer policy/short_faq over web_news
- If ragMode is web, prefer web_news`

export async function orchestrate(
  question: string,
  options: {
    mode: PromptMode
    ragWeak?: boolean
    hasSources?: boolean
  },
): Promise<OrchestrationDecision> {
  if (options.mode === 'web') {
    const preferred = pickAvailable(INTENT_FALLBACK.web_news)
    const llm = await tryLlmOrchestrate(question, options).catch(() => null)
    if (llm) {
      return {
        ...llm,
        intent: 'web_news',
        preferredModel: resolveModel('web_news', llm.preferredModel),
      }
    }
    return {
      intent: 'web_news',
      preferredModel: preferred,
      reason: '웹검색 모드 → Perplexity/가용 모델',
      confidence: 0.7,
      orchestratorModel: null,
      usedHeuristic: true,
    }
  }

  try {
    const llm = await tryLlmOrchestrate(question, options)
    return {
      ...llm,
      preferredModel: resolveModel(llm.intent, llm.preferredModel),
    }
  } catch (err) {
    console.warn('[orchestrator] LLM classify failed, using heuristic', err)
    return heuristicDecision(question, options)
  }
}

async function tryLlmOrchestrate(
  question: string,
  options: { mode: PromptMode; ragWeak?: boolean; hasSources?: boolean },
): Promise<OrchestrationDecision> {
  const orchModel = ORCHESTRATOR_ORDER.find((m) => hasProviderKey(m))
  if (!orchModel) {
    throw new Error('No orchestrator API key')
  }

  const userPrompt = `ragMode=${options.mode}
ragWeak=${Boolean(options.ragWeak)}
hasSources=${Boolean(options.hasSources)}
question:
${question}`

  const raw = await callOrchestrator(orchModel, userPrompt)
  const parsed = parseDecision(raw)
  return {
    ...parsed,
    orchestratorModel: orchModel,
    usedHeuristic: false,
  }
}

function heuristicDecision(
  question: string,
  options: { mode: PromptMode; ragWeak?: boolean },
): OrchestrationDecision {
  const routed = routeModel(question, 'auto', {
    ragWeak: options.ragWeak,
    preferWeb: options.mode === 'web',
  })
  const intent = guessIntent(question, options)
  return {
    intent,
    preferredModel: resolveModel(intent, routed.model),
    reason: routed.reason,
    confidence: 0.55,
    orchestratorModel: null,
    usedHeuristic: true,
  }
}

function guessIntent(
  question: string,
  options: { mode: PromptMode; ragWeak?: boolean },
): OrchestrationIntent {
  const q = question.trim()
  const lower = q.toLowerCase()
  if (options.mode === 'web') return 'web_news'
  if (
    /최신|뉴스|검색|오늘|최근|시세|주가|weather|news|search|latest/.test(lower) ||
    /최신|뉴스|검색|오늘|최근/.test(q)
  ) {
    return 'web_news'
  }
  if (/규정|정책|해석|계약|법률|조항|매뉴얼|취업규칙|연차|급여/.test(q)) {
    return 'policy'
  }
  if (q.length > 120) return 'reasoning'
  if (q.length < 40) return 'short_faq'
  return 'general'
}

function resolveModel(
  intent: OrchestrationIntent,
  preferred: ProviderModel,
): ProviderModel {
  if (hasProviderKey(preferred)) return preferred
  return pickAvailable(INTENT_FALLBACK[intent])
}

function pickAvailable(order: ProviderModel[]): ProviderModel {
  for (const model of order) {
    if (hasProviderKey(model)) return model
  }
  return order[0]
}

function parseDecision(raw: string): Omit<
  OrchestrationDecision,
  'orchestratorModel' | 'usedHeuristic'
> {
  const jsonText = extractJson(raw)
  const data = JSON.parse(jsonText) as Record<string, unknown>
  const intent = String(data.intent ?? '') as OrchestrationIntent
  const preferredModel = String(data.preferredModel ?? '') as ProviderModel
  if (!VALID_INTENTS.has(intent) || !VALID_MODELS.has(preferredModel)) {
    throw new Error(`Invalid orchestration JSON: ${jsonText}`)
  }
  const confidence = Number(data.confidence)
  return {
    intent,
    preferredModel,
    reason: String(data.reason ?? '오케스트레이션').slice(0, 200),
    confidence: Number.isFinite(confidence)
      ? Math.min(1, Math.max(0, confidence))
      : 0.5,
  }
}

function extractJson(text: string): string {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence?.[1]) return fence[1].trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

async function callOrchestrator(
  model: ProviderModel,
  userPrompt: string,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    switch (model) {
      case 'gpt':
        return await callGptOrch(userPrompt, controller.signal)
      case 'gemini':
        return await callGeminiOrch(userPrompt, controller.signal)
      case 'claude':
        return await callClaudeOrch(userPrompt, controller.signal)
      default:
        throw new Error(`Orchestrator unsupported: ${model}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

async function callGptOrch(userPrompt: string, signal: AbortSignal): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('OPENAI_API_KEY missing')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ORCH_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI orch: ${res.status}`)
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI orch empty')
  return text
}

async function callClaudeOrch(
  userPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) throw new Error('ANTHROPIC_API_KEY missing')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      temperature: 0,
      system: ORCH_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic orch: ${res.status}`)
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>
  }
  const text = data.content?.find((c) => c.type === 'text')?.text?.trim()
  if (!text) throw new Error('Anthropic orch empty')
  return text
}

async function callGeminiOrch(
  userPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const key = process.env.GOOGLE_API_KEY?.trim()
  if (!key) throw new Error('GOOGLE_API_KEY missing')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: ORCH_SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    }),
  })
  if (!res.ok) throw new Error(`Gemini orch: ${res.status}`)
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Gemini orch empty')
  return text
}
