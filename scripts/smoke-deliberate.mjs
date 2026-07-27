const base = process.env.API_URL || 'http://localhost:8787'

async function chat(question, model = 'auto') {
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, model, workspaceId: 'ws-hr' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}

function preview(text, n = 160) {
  const t = String(text || '')
  return t.length > n ? `${t.slice(0, n)}…` : t
}

console.log('=== AUTO deliberate: 신입 연차? ===')
const doc = await chat('신입 연차?', 'auto')
console.log({
  mode: doc.mode,
  model: doc.model,
  sources: doc.sources,
  route: doc.routeReason,
  steps: (doc.deliberation || []).map((s) => `${s.round}/${s.role}/${s.model}`),
  answer: preview(doc.answer),
})

console.log('=== AUTO deliberate: RAG이 뭐야? ===')
const gen = await chat('RAG이 뭐야?', 'auto')
console.log({
  mode: gen.mode,
  model: gen.model,
  sources: gen.sources,
  route: gen.routeReason,
  steps: (gen.deliberation || []).map((s) => `${s.round}/${s.role}/${s.model}`),
  answer: preview(gen.answer, 220),
})

console.log('=== MANUAL gpt ===')
const manual = await chat('짧은 테스트', 'gpt')
console.log({
  model: manual.model,
  route: manual.routeReason,
  hasDelib: Boolean(manual.deliberation?.length),
})

const drafts = (doc.deliberation || []).filter((s) => s.role === 'draft')
const chair = (doc.deliberation || []).find((s) => s.role === 'chair')
const docsOk =
  doc.mode === 'docs' &&
  /deliberate/i.test(doc.routeReason) &&
  drafts.length >= 1 &&
  Array.isArray(doc.sources) &&
  doc.sources.length > 0

const hybridOk =
  gen.mode === 'hybrid' &&
  /deliberate/i.test(gen.routeReason) &&
  (gen.deliberation || []).length >= 1 &&
  !/문서에서 확인할 수 없|문서에 없/.test(gen.answer || '')

const manualOk = !manual.deliberation?.length && /수동 선택/i.test(manual.routeReason || '')

console.log('PASS', {
  docsOk,
  hybridOk,
  manualOk,
  draftCount: drafts.length,
  hasChair: Boolean(chair),
})
process.exit(docsOk && hybridOk && manualOk ? 0 : 1)
