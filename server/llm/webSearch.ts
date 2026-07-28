export interface WebSearchHit {
  title: string
  link: string
  snippet: string
}

/** Google Custom Search (optional). Requires GOOGLE_API_KEY + GOOGLE_CSE_ID. */
export async function searchGoogleWeb(
  query: string,
  topK = 5,
): Promise<WebSearchHit[]> {
  const key = process.env.GOOGLE_API_KEY?.trim()
  const cx = process.env.GOOGLE_CSE_ID?.trim()
  if (!key || !cx) return []

  const url = new URL('https://www.googleapis.com/customsearch/v1')
  url.searchParams.set('key', key)
  url.searchParams.set('cx', cx)
  url.searchParams.set('q', query)
  url.searchParams.set('num', String(Math.min(10, Math.max(1, topK))))

  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Google CSE: ${text}`)
  }

  const data = (await res.json()) as {
    items?: Array<{ title?: string; link?: string; snippet?: string }>
  }

  return (data.items ?? [])
    .filter((i) => i.link)
    .map((i) => ({
      title: i.title?.trim() || i.link!,
      link: i.link!,
      snippet: i.snippet?.trim() || '',
    }))
}

export function buildWebSearchContext(hits: WebSearchHit[]): {
  context: string
  sources: string[]
} {
  if (hits.length === 0) return { context: '', sources: [] }
  const sources = hits.map((h) => h.link)
  const context = hits
    .map(
      (h, i) =>
        `[Web ${i + 1}] ${h.title}\nURL: ${h.link}\n${h.snippet}`.trim(),
    )
    .join('\n\n')
  return { context, sources }
}

export function isGoogleSearchConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_API_KEY?.trim() && process.env.GOOGLE_CSE_ID?.trim(),
  )
}
