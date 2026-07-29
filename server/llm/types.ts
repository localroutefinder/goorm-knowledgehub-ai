export type ProviderModel = 'gpt' | 'claude' | 'gemini' | 'perplexity' | 'local'

export type RequestedModel = ProviderModel | 'auto'

export type PromptMode = 'docs' | 'hybrid' | 'web'

export type OrchestrationIntent =
  | 'policy'
  | 'short_faq'
  | 'reasoning'
  | 'web_news'
  | 'general'

export interface OrchestrationDecision {
  intent: OrchestrationIntent
  preferredModel: ProviderModel
  reason: string
  confidence: number
  /** Model that ran the orchestrator JSON call; null if heuristic fallback */
  orchestratorModel: ProviderModel | null
  usedHeuristic: boolean
}

export interface DeliberationStep {
  round: 1 | 2
  model: ProviderModel
  role: 'draft' | 'chair'
  content: string
}

export interface GenerationOptions {
  /** 0–2, default provider-specific */
  temperature?: number
  /** completion budget, default 1024 */
  maxTokens?: number
  /** Extra system instructions prepended to the base prompt */
  systemInstructions?: string
  /** Prefer web grounding / search citations when available */
  includeWebSearch?: boolean
  /** Force injecting top RAG hits even when score is weak */
  preferDocuments?: boolean
}

export interface ProviderCallResult {
  answer: string
  citations?: string[]
}

export interface LlmResult {
  answer: string
  model: ProviderModel
  routeReason: string
  latencyMs: number
  fallbackUsed: boolean
  sources: string[]
  mode: PromptMode
  orchestration?: OrchestrationDecision
  deliberation?: DeliberationStep[]
  generation?: {
    temperature: number
    maxTokens: number
    systemInstructions?: string
    includeWebSearch: boolean
    preferDocuments: boolean
  }
}

const BASE_PROMPT = `당신은 Goorm KnowledgeHub AI입니다.
조직·부서 업무를 돕는 한국어 AI 비서입니다.
답변은 명확하고 실무적으로 작성하세요.`

export function clampTemperature(value: unknown, fallback = 0.3): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(2, Math.max(0, n))
}

export function clampMaxTokens(value: unknown, fallback = 1024): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(8192, Math.max(64, Math.round(n)))
}

export function normalizeGenerationOptions(
  raw: Partial<GenerationOptions> | undefined,
): Required<
  Pick<
    GenerationOptions,
    'temperature' | 'maxTokens' | 'includeWebSearch' | 'preferDocuments'
  >
> &
  Pick<GenerationOptions, 'systemInstructions'> {
  return {
    temperature: clampTemperature(raw?.temperature, 0.3),
    maxTokens: clampMaxTokens(raw?.maxTokens, 1024),
    systemInstructions: raw?.systemInstructions?.trim() || undefined,
    includeWebSearch: Boolean(raw?.includeWebSearch),
    preferDocuments: Boolean(raw?.preferDocuments),
  }
}

export function buildSystemPrompt(
  ragContext?: string,
  mode: PromptMode = 'docs',
  systemInstructions?: string,
): string {
  const custom = systemInstructions?.trim()
  const base = custom
    ? `${BASE_PROMPT}

[추가 System Instructions]
${custom}`
    : BASE_PROMPT

  if (mode === 'docs') {
    let prompt = `${base}
제공된 문서 컨텍스트가 있으면 그 내용을 우선 근거로 답하세요.
컨텍스트에 없으면 추측하지 말고, 조직 문서에서 확인할 수 없다고 말하세요.
가능하면 근거가 된 문서명을 답변에 명시하세요.`
    if (ragContext?.trim()) {
      prompt += `

아래는 검색된 조직 문서 컨텍스트입니다. 이 내용을 근거로 답하세요.

<<<CONTEXT
${ragContext}
CONTEXT>>>`
    }
    return prompt
  }

  if (mode === 'web') {
    let prompt = `${base}
외부 웹 검색/일반 지식을 활용해 답하세요.
조직 문서 근거가 아니면 그 점을 짧게 명시하세요.
웹 근거가 있으면 출처 URL을 답변에 포함하세요.`
    if (ragContext?.trim()) {
      prompt += `

참고용 조직 문서/검색 컨텍스트(보조):
<<<CONTEXT
${ragContext}
CONTEXT>>>`
    }
    return prompt
  }

  // hybrid
  let prompt = `${base}
관련 조직 문서가 있으면 문서를 우선 근거로 답하세요.
관련 문서가 없거나 부족하면 일반 지식(또는 웹 정보)으로 답하되, 문서 근거가 아님을 명시하세요.
추측성 사내 규정은 만들어내지 마세요.
기술·AI 용어(예: RAG)는 KnowledgeHub 맥락에서 일반적으로 쓰이는 의미(예: Retrieval-Augmented Generation)를 우선 설명하세요.
웹/검색 근거가 있으면 링크를 함께 제시하세요.`
  if (ragContext?.trim()) {
    prompt += `

참고 컨텍스트(관련도가 낮을 수 있음):
<<<CONTEXT
${ragContext}
CONTEXT>>>`
  }
  return prompt
}

export function hasProviderKey(model: ProviderModel): boolean {
  switch (model) {
    case 'gpt':
      return Boolean(process.env.OPENAI_API_KEY?.trim())
    case 'claude':
      return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
    case 'gemini':
      return Boolean(process.env.GOOGLE_API_KEY?.trim())
    case 'perplexity':
      return Boolean(process.env.PERPLEXITY_API_KEY?.trim())
    case 'local':
      return Boolean(process.env.LMSTUDIO_BASE_URL?.trim())
  }
}
