import { hasProviderKey, type ProviderModel, type RequestedModel } from './types.js'

export interface RouteDecision {
  model: ProviderModel
  reason: string
}

export function routeModel(
  question: string,
  requested: RequestedModel,
  options: { ragWeak?: boolean; preferWeb?: boolean } = {},
): RouteDecision {
  if (requested !== 'auto') {
    return {
      model: requested,
      reason: `수동 선택 → ${requested.toUpperCase()}`,
    }
  }

  const q = question.trim()
  const lower = q.toLowerCase()

  if (options.preferWeb || options.ragWeak) {
    return {
      model: pickAvailable(['perplexity', 'gpt', 'claude', 'gemini']),
      reason: options.preferWeb
        ? '웹검색 모드 → Perplexity 우선'
        : 'RAG weak → 일반지식/웹 보강 · Perplexity 우선',
    }
  }

  if (
    /최신|뉴스|검색|오늘|최근|시세|주가|weather|news|search|latest/.test(lower) ||
    /최신|뉴스|검색|오늘|최근/.test(q)
  ) {
    return {
      model: pickAvailable(['perplexity', 'gpt', 'gemini', 'claude']),
      reason: '질문 유형=최신/검색 보강 → Perplexity 우선',
    }
  }

  if (
    q.length > 120 ||
    /규정|정책|해석|계약|법률|조항|매뉴얼|취업규칙|연차|급여/.test(q)
  ) {
    return {
      model: pickAvailable(['claude', 'gpt', 'gemini', 'perplexity']),
      reason: '질문 유형=규정/정책 해석 · 문서길이=중장문 → Claude 우선',
    }
  }

  if (q.length < 40) {
    return {
      model: pickAvailable(['gpt', 'gemini', 'claude', 'perplexity']),
      reason: '짧은 질의 · 비용 최적화 → GPT 우선',
    }
  }

  return {
    model: pickAvailable(['gemini', 'gpt', 'claude', 'perplexity']),
    reason: '범용 질의 → Gemini 우선',
  }
}

function pickAvailable(order: ProviderModel[]): ProviderModel {
  for (const model of order) {
    if (hasProviderKey(model)) return model
  }
  return order[0]
}
