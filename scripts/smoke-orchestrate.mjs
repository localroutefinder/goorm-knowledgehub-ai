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

function preview(text, n = 200) {
  const t = String(text || '')
  return t.length > n ? `${t.slice(0, n)}…` : t
}

console.log('=== AUTO 신입 연차? ===')
const doc = await chat('신입 연차?', 'auto')
console.log({
  mode: doc.mode,
  model: doc.model,
  sources: doc.sources,
  route: doc.routeReason,
  orch: doc.orchestration,
  answer: preview(doc.answer),
})

console.log('=== AUTO RAG이 뭐야? ===')
const gen = await chat('RAG이 뭐야?', 'auto')
console.log({
  mode: gen.mode,
  model: gen.model,
  sources: gen.sources,
  route: gen.routeReason,
  orch: gen.orchestration,
  answer: preview(gen.answer, 280),
})

console.log('=== MANUAL claude ===')
const manual = await chat('짧은 테스트', 'claude')
console.log({
  model: manual.model,
  route: manual.routeReason,
  hasOrch: Boolean(manual.orchestration),
})

const docsOk =
  doc.mode === 'docs' &&
  /Auto orchestrate/i.test(doc.routeReason) &&
  Array.isArray(doc.sources) &&
  doc.sources.length > 0

const hybridOk =
  gen.mode === 'hybrid' &&
  /Auto orchestrate/i.test(gen.routeReason) &&
  !/문서에서 확인할 수 없|문서에 없/.test(gen.answer || '')

const manualOk =
  !manual.orchestration && /수동 선택/i.test(manual.routeReason || '')

console.log('PASS', { docsOk, hybridOk, manualOk })
process.exit(docsOk && hybridOk && manualOk ? 0 : 1)
