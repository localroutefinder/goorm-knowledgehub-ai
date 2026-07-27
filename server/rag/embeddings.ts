import { estimateTokens, recordUsage } from '../usage/usage.js'

export async function embedTexts(
  texts: string[],
  options: { workspaceId?: string; log?: boolean } = {},
): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('OPENAI_API_KEY is required for embeddings')
  if (texts.length === 0) return []

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Embedding failed: ${err}`)
  }

  const data = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>
    usage?: { total_tokens?: number }
  }

  if (options.log !== false && options.workspaceId) {
    const tokens =
      data.usage?.total_tokens ?? estimateTokens(...texts)
    try {
      await recordUsage({
        workspaceId: options.workspaceId,
        model: 'embedding',
        tokens,
        kind: 'embed',
      })
    } catch (err) {
      console.warn('[usage] embed log failed', err)
    }
  }

  return data.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)
}

export async function embedQuery(
  text: string,
  options: { workspaceId?: string } = {},
): Promise<number[]> {
  const [embedding] = await embedTexts([text], {
    workspaceId: options.workspaceId,
    log: true,
  })
  return embedding
}

export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}
