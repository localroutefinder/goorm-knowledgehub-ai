import { buildSystemPrompt, type PromptMode, type ProviderModel } from './types.js'

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string }; message?: string }
    return data.error?.message || data.message || res.statusText
  } catch {
    return res.statusText
  }
}

export async function callGpt(
  question: string,
  ragContext?: string,
  mode: PromptMode = 'docs',
): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('OPENAI_API_KEY is missing')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt(ragContext, mode) },
        { role: 'user', content: question },
      ],
      temperature: 0.3,
    }),
  })

  if (!res.ok) throw new Error(`OpenAI: ${await readError(res)}`)
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const answer = data.choices?.[0]?.message?.content?.trim()
  if (!answer) throw new Error('OpenAI returned empty response')
  return answer
}

export async function callClaude(
  question: string,
  ragContext?: string,
  mode: PromptMode = 'docs',
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) throw new Error('ANTHROPIC_API_KEY is missing')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: buildSystemPrompt(ragContext, mode),
      messages: [{ role: 'user', content: question }],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic: ${await readError(res)}`)
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>
  }
  const answer = data.content?.find((c) => c.type === 'text')?.text?.trim()
  if (!answer) throw new Error('Anthropic returned empty response')
  return answer
}

export async function callGemini(
  question: string,
  ragContext?: string,
  mode: PromptMode = 'docs',
): Promise<string> {
  const key = process.env.GOOGLE_API_KEY?.trim()
  if (!key) throw new Error('GOOGLE_API_KEY is missing')

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(ragContext, mode) }] },
      contents: [{ role: 'user', parts: [{ text: question }] }],
      generationConfig: { temperature: 0.3 },
    }),
  })

  if (!res.ok) throw new Error(`Gemini: ${await readError(res)}`)
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!answer) throw new Error('Gemini returned empty response')
  return answer
}

export async function callPerplexity(
  question: string,
  ragContext?: string,
  mode: PromptMode = 'web',
): Promise<string> {
  const key = process.env.PERPLEXITY_API_KEY?.trim()
  if (!key) throw new Error('PERPLEXITY_API_KEY is missing')

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: buildSystemPrompt(ragContext, mode) },
        { role: 'user', content: question },
      ],
      temperature: 0.2,
    }),
  })

  if (!res.ok) throw new Error(`Perplexity: ${await readError(res)}`)
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const answer = data.choices?.[0]?.message?.content?.trim()
  if (!answer) throw new Error('Perplexity returned empty response')
  return answer
}

export async function callProvider(
  model: ProviderModel,
  question: string,
  ragContext?: string,
  mode: PromptMode = 'docs',
): Promise<string> {
  switch (model) {
    case 'gpt':
      return callGpt(question, ragContext, mode)
    case 'claude':
      return callClaude(question, ragContext, mode)
    case 'gemini':
      return callGemini(question, ragContext, mode)
    case 'perplexity':
      return callPerplexity(question, ragContext, mode === 'docs' ? 'web' : mode)
  }
}
