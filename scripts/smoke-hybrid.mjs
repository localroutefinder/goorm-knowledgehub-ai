const base = process.env.API_URL || 'http://localhost:8787'

async function chat(question) {
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, model: 'auto', workspaceId: 'ws-hr' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}

function preview(text, n = 280) {
  const t = String(text || '')
  return t.length > n ? `${t.slice(0, n)}…` : t
}

const doc = await chat('신입 연차?')
console.log('=== DOC ===')
console.log({
  mode: doc.mode,
  model: doc.model,
  sources: doc.sources,
  route: doc.routeReason,
  answer: preview(doc.answer),
})

const gen = await chat('RAG이 뭐야?')
console.log('=== GENERAL ===')
console.log({
  mode: gen.mode,
  model: gen.model,
  sources: gen.sources,
  route: gen.routeReason,
  answer: preview(gen.answer, 360),
})

const docsOk =
  doc.mode === 'docs' &&
  Array.isArray(doc.sources) &&
  doc.sources.some((s) => /Leave|연차|HR/i.test(s))
const hybridOk =
  gen.mode === 'hybrid' &&
  (!gen.sources || gen.sources.length === 0) &&
  !/문서에서 확인할 수 없|문서에 없/.test(gen.answer || '')
const ragSense = /Retrieval|검색.?증강|문서.?검색|Augmented/i.test(gen.answer || '')

console.log('PASS', { docsOk, hybridOk, ragSense })
process.exit(docsOk && hybridOk ? 0 : 1)
