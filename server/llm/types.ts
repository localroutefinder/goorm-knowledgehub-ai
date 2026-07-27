export type ProviderModel = 'gpt' | 'claude' | 'gemini' | 'perplexity'

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
}

const BASE_PROMPT = `당신은 Goorm KnowledgeHub AI입니다.
조직·부서 업무를 돕는 한국어 AI 비서입니다.
답변은 명확하고 실무적으로 작성하세요.`

export function buildSystemPrompt(
  ragContext?: string,
  mode: PromptMode = 'docs',
): string {
  if (mode === 'docs') {
    let prompt = `${BASE_PROMPT}
제공된 문서 컨텍스트가 있으면 그 내용을 우선 근거로 답하세요.
컨텍스트에 없으면 추측하지 말고, 조직 문서에서 확인할 수 없다고 말하세요.`
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
    let prompt = `${BASE_PROMPT}
외부 웹 검색/일반 지식을 활용해 답하세요.
조직 문서 근거가 아니면 그 점을 짧게 명시하세요.`
    if (ragContext?.trim()) {
      prompt += `

참고용 조직 문서(보조):
<<<CONTEXT
${ragContext}
CONTEXT>>>`
    }
    return prompt
  }

  // hybrid
  let prompt = `${BASE_PROMPT}
관련 조직 문서가 있으면 문서를 우선 근거로 답하세요.
관련 문서가 없거나 부족하면 일반 지식(또는 웹 정보)으로 답하되, 문서 근거가 아님을 명시하세요.
추측성 사내 규정은 만들어내지 마세요.
기술·AI 용어(예: RAG)는 KnowledgeHub 맥락에서 일반적으로 쓰이는 의미(예: Retrieval-Augmented Generation)를 우선 설명하세요.`
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
  }
}
