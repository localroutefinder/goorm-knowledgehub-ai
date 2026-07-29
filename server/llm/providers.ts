import {
  buildSystemPrompt,
  clampMaxTokens,
  clampTemperature,
  type GenerationOptions,
  type PromptMode,
  type ProviderCallResult,
  type ProviderModel,
} from './types.js'

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string }; message?: string }
    return data.error?.message || data.message || res.statusText
  } catch {
    return res.statusText
  }
}

function genDefaults(gen?: GenerationOptions) {
  return {
    temperature: clampTemperature(gen?.temperature, 0.3),
    maxTokens: clampMaxTokens(gen?.maxTokens, 1024),
    systemInstructions: gen?.systemInstructions?.trim() || undefined,
    includeWebSearch: Boolean(gen?.includeWebSearch),
  }
}

function uniqUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of urls) {
    const t = u.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export async function callGpt(
  question: string,
  ragContext?: string,
  mode: PromptMode = 'docs',
  gen?: GenerationOptions,
): Promise<ProviderCallResult> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('OPENAI_API_KEY is missing')
  const opts = genDefaults(gen)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(ragContext, mode, opts.systemInstructions),
        },
        { role: 'user', content: question },
      ],
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
    }),
  })

  if (!res.ok) throw new Error(`OpenAI: ${await readError(res)}`)
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const answer = data.choices?.[0]?.message?.content?.trim()
  if (!answer) throw new Error('OpenAI returned empty response')
  return { answer }
}

export async function callClaude(
  question: string,
  ragContext?: string,
  mode: PromptMode = 'docs',
  gen?: GenerationOptions,
): Promise<ProviderCallResult> {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) throw new Error('ANTHROPIC_API_KEY is missing')
  const opts = genDefaults(gen)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      system: buildSystemPrompt(ragContext, mode, opts.systemInstructions),
      messages: [{ role: 'user', content: question }],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic: ${await readError(res)}`)
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>
  }
  const answer = data.content?.find((c) => c.type === 'text')?.text?.trim()
  if (!answer) throw new Error('Anthropic returned empty response')
  return { answer }
}

export async function callGemini(
  question: string,
  ragContext?: string,
  mode: PromptMode = 'docs',
  gen?: GenerationOptions,
): Promise<ProviderCallResult> {
  const key = process.env.GOOGLE_API_KEY?.trim()
  if (!key) throw new Error('GOOGLE_API_KEY is missing')
  const opts = genDefaults(gen)
  const useGrounding = opts.includeWebSearch || mode === 'web'

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`

  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [
        {
          text: buildSystemPrompt(ragContext, mode, opts.systemInstructions),
        },
      ],
    },
    contents: [{ role: 'user', parts: [{ text: question }] }],
    generationConfig: {
      temperature: opts.temperature,
      maxOutputTokens: opts.maxTokens,
    },
  }

  if (useGrounding) {
    body.tools = [{ google_search: {} }]
  }

  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  // Some keys/regions reject google_search tool — retry without grounding
  if (!res.ok && useGrounding) {
    const errText = await readError(res)
    if (/tool|grounding|search|INVALID/i.test(errText)) {
      delete body.tools
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      throw new Error(`Gemini: ${errText}`)
    }
  }

  if (!res.ok) throw new Error(`Gemini: ${await readError(res)}`)
  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>
        groundingSupports?: unknown
      }
    }>
  }
  const candidate = data.candidates?.[0]
  const answer = candidate?.content?.parts?.[0]?.text?.trim()
  if (!answer) throw new Error('Gemini returned empty response')

  const citations = uniqUrls(
    (candidate?.groundingMetadata?.groundingChunks ?? [])
      .map((c) => c.web?.uri)
      .filter((u): u is string => Boolean(u)),
  )

  return { answer, citations: citations.length ? citations : undefined }
}

export async function callPerplexity(
  question: string,
  ragContext?: string,
  mode: PromptMode = 'web',
  gen?: GenerationOptions,
): Promise<ProviderCallResult> {
  const key = process.env.PERPLEXITY_API_KEY?.trim()
  if (!key) throw new Error('PERPLEXITY_API_KEY is missing')
  const opts = genDefaults({ ...gen, temperature: gen?.temperature ?? 0.2 })

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(ragContext, mode, opts.systemInstructions),
        },
        { role: 'user', content: question },
      ],
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
    }),
  })

  if (!res.ok) throw new Error(`Perplexity: ${await readError(res)}`)
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    citations?: string[]
  }
  const answer = data.choices?.[0]?.message?.content?.trim()
  if (!answer) throw new Error('Perplexity returned empty response')
  const citations = uniqUrls(data.citations ?? [])
  return { answer, citations: citations.length ? citations : undefined }
}

export async function callLocal(
  question: string,
  ragContext?: string,
  mode: PromptMode = 'docs',
  gen?: GenerationOptions,
): Promise<ProviderCallResult> {
  const baseUrl = process.env.LMSTUDIO_BASE_URL?.trim().replace(/\/$/, '')
  if (!baseUrl) throw new Error('LMSTUDIO_BASE_URL is missing')
  const model =
    process.env.LMSTUDIO_MODEL?.trim() || 'qwen2.5-coder-3b-instruct'
  const apiKey = process.env.LMSTUDIO_API_KEY?.trim() || 'lm-studio'
  const opts = genDefaults(gen)

  let res: Response
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(ragContext, mode, opts.systemInstructions),
          },
          { role: 'user', content: question },
        ],
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
      }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`LM Studio unreachable: ${message}`)
  }

  if (!res.ok) throw new Error(`LM Studio: ${await readError(res)}`)
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const answer = data.choices?.[0]?.message?.content?.trim()
  if (!answer) throw new Error('LM Studio returned empty response')
  return { answer }
}

export async function callProvider(
  model: ProviderModel,
  question: string,
  ragContext?: string,
  mode: PromptMode = 'docs',
  gen?: GenerationOptions,
): Promise<ProviderCallResult> {
  switch (model) {
    case 'gpt':
      return callGpt(question, ragContext, mode, gen)
    case 'claude':
      return callClaude(question, ragContext, mode, gen)
    case 'gemini':
      return callGemini(question, ragContext, mode, gen)
    case 'perplexity':
      return callPerplexity(
        question,
        ragContext,
        mode === 'docs' ? 'web' : mode,
        gen,
      )
    case 'local':
      return callLocal(question, ragContext, mode, gen)
  }
}
