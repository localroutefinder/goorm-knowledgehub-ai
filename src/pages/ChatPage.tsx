import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/shell/AppShell'
import { AnswerView } from '@/components/ui/AnswerView'
import { Icon } from '@/components/ui/Icon'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { Button } from '@/components/ui/Button'
import { fetchChatHistory, sendChat } from '@/services/api'
import { useAppStore } from '@/store/AppStore'
import type { DeliberationStep, LlmModel } from '@/types'

const models: { id: LlmModel; label: string; sub: string; color: string }[] = [
  { id: 'gpt', label: 'OPENAI', sub: 'GPT', color: 'text-gpt border-gpt' },
  { id: 'claude', label: 'ANTHROPIC', sub: 'Claude', color: 'text-claude border-claude' },
  { id: 'gemini', label: 'GOOGLE', sub: 'Gemini', color: 'text-gemini border-gemini' },
  {
    id: 'perplexity',
    label: 'PERPLEXITY',
    sub: 'Web Search',
    color: 'text-perplexity border-perplexity',
  },
  {
    id: 'auto',
    label: 'AUTO',
    sub: 'Deliberate',
    color: 'text-white border-white/40',
  },
]

const modelBadge: Record<string, string> = {
  gpt: 'border-gpt text-gpt',
  claude: 'border-claude text-claude',
  gemini: 'border-gemini text-gemini',
  perplexity: 'border-perplexity text-perplexity',
}

function DeliberationPanel({ steps }: { steps: DeliberationStep[] }) {
  const [open, setOpen] = useState(true)
  const drafts = steps.filter((s) => s.role === 'draft')
  const chair = steps.find((s) => s.role === 'chair')

  return (
    <div className="mb-4 rounded border border-white/10 bg-surface-container-high/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <MonoLabel className="text-secondary">
          협의 과정 · Round 1 초안 {drafts.length}
          {chair ? ' → Round 2 합의' : ''}
        </MonoLabel>
        <Icon
          name={open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
          className="text-sm text-outline"
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-white/5 px-3 py-3">
          {drafts.map((step, i) => (
            <div
              key={`${step.model}-${i}`}
              className="rounded border border-white/10 bg-deep-gunmetal/80 p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                    modelBadge[step.model] ?? 'border-outline text-outline'
                  }`}
                >
                  {step.model}
                </span>
                <span className="font-mono text-[10px] text-outline">Round 1 · 초안</span>
              </div>
              <AnswerView content={step.content} label="" compact defaultMode="web" />
            </div>
          ))}
          {chair ? (
            <div className="rounded border border-secondary/40 bg-secondary/5 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded border border-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase text-secondary">
                  합의 · {chair.model}
                </span>
                <span className="font-mono text-[10px] text-outline">Round 2 · Chair</span>
              </div>
              <AnswerView content={chair.content} label="" compact defaultMode="web" />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function ChatPage() {
  const { selectedModel, setModel, selectedWorkspaceId } = useAppStore()
  const [input, setInput] = useState('')
  const queryClient = useQueryClient()

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', selectedWorkspaceId],
    queryFn: () => fetchChatHistory(selectedWorkspaceId),
  })

  const mutation = useMutation({
    mutationFn: (q: string) => sendChat(q, selectedModel, messages, selectedWorkspaceId),
    onSuccess: (data) => {
      queryClient.setQueryData(['chat', selectedWorkspaceId], data)
      setInput('')
    },
  })

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  const errorMessage =
    mutation.error instanceof Error ? mutation.error.message : mutation.error
      ? String(mutation.error)
      : null

  return (
    <AppShell
      title="Goorm KnowledgeHub"
      topLinks={
        <span className="rounded bg-tertiary-container px-2 py-1 font-mono text-[10px] uppercase text-on-tertiary-container">
          Enterprise RAG
        </span>
      }
    >
      <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-white/5 bg-deep-gunmetal/80 p-6 xl:block">
          <MonoLabel className="mb-4 block text-outline">Context Filters</MonoLabel>
          <div className="space-y-4">
            {['HR DEPT', 'LEGAL', 'R&D LABS'].map((dept, i) => (
              <div key={dept}>
                <button
                  type="button"
                  className="mb-2 flex w-full items-center gap-2 text-left font-mono text-xs font-bold hover:text-secondary"
                >
                  <Icon
                    name={i === 0 ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                    className="text-sm"
                  />
                  {dept}
                </button>
                {i === 0 ? (
                  <div className="ml-2 space-y-1 border-l border-outline-variant pl-4 text-sm text-on-surface-variant">
                    <p>Manuals & SOPs</p>
                    <p>Benefits 2024</p>
                    <p className="flex items-center gap-2 font-bold text-primary">
                      <span className="h-1 w-1 rounded-full bg-primary" />
                      Payroll Logic
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-10">
            <MonoLabel className="mb-3 block text-[10px] text-outline">
              Active Knowledge Bases
            </MonoLabel>
            {['Compliance_Matrix_v2', 'Internal_Tech_Docs'].map((kb) => (
              <div
                key={kb}
                className="mb-2 flex items-center justify-between rounded border border-white/5 bg-surface-variant/30 p-3 text-xs"
              >
                {kb}
                <Icon name="verified" className="text-sm text-secondary" />
              </div>
            ))}
            <MonoLabel className="mt-4 block text-[10px] text-outline">
              Workspace: {selectedWorkspaceId}
            </MonoLabel>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-outline-variant bg-deep-gunmetal/50 p-4 md:p-6">
            <div className="flex flex-wrap gap-3">
              {models.map((m) => {
                const active = selectedModel === m.id
                const isAuto = m.id === 'auto'
                return (
                  <button
                    key={m.id}
                    type="button"
                    title={
                      m.id === 'perplexity'
                        ? '웹 검색 모드 (Perplexity Sonar) — 조직 문서는 보조'
                        : m.id === 'auto'
                          ? '멀티 LLM 초안 후 합의 최종안'
                          : undefined
                    }
                    onClick={() => setModel(m.id)}
                    className={`min-w-[100px] flex-1 rounded px-4 py-3 milled-edge transition ${
                      isAuto && active
                        ? 'bg-gradient-to-r from-primary-container to-tertiary-container shadow-[0_0_20px_rgba(108,56,255,0.4)]'
                        : active
                          ? `neon-glow-cyan border ${m.color}`
                          : 'hover:border-white/20'
                    }`}
                  >
                    <MonoLabel className={`block text-[10px] ${active ? m.color.split(' ')[0] : 'text-outline'}`}>
                      {m.sub}
                    </MonoLabel>
                    <span
                      className={`font-display text-sm font-black ${
                        active ? (isAuto ? 'text-white italic' : m.color.split(' ')[0]) : 'text-on-surface-variant'
                      }`}
                    >
                      {m.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto bg-deep-gunmetal/20 p-4 halftone-dot md:p-8">
            {messages.length === 0 && !mutation.isPending ? (
              <div className="rounded border border-white/10 bg-surface-container-low p-6 text-sm text-on-surface-variant">
                Neon RAG가 연결되었습니다. AUTO는 멀티 LLM 협의 후 최종 답변을 만듭니다.
                <br />
                <span className="font-mono text-[11px] text-outline">
                  Workspace: {selectedWorkspaceId} · 예: “신입 연차?”
                </span>
              </div>
            ) : null}

            {messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="relative max-w-[85%] rounded-sm border border-white/10 bg-steel-blue p-5 text-white hard-shadow md:max-w-[75%]">
                    <p className="text-sm leading-relaxed">{msg.question}</p>
                    <span className="absolute -top-3 right-3 rounded bg-primary-container px-2 py-0.5 font-mono text-[10px] text-white">
                      USER
                    </span>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex justify-start">
                  <div className="max-w-[90%] rounded-sm border border-secondary/40 bg-deep-gunmetal p-5 halftone-dot md:max-w-[80%]">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary-container">
                        <Icon name="smart_toy" className="text-xs text-on-secondary" />
                      </div>
                      <MonoLabel className="text-secondary">Goorm Intelligence</MonoLabel>
                      <span className="text-[10px] text-outline">
                        {msg.model.toUpperCase()}
                        {msg.deliberation?.length ? ' · DELIBERATE' : ''}
                      </span>
                    </div>

                    {msg.deliberation && msg.deliberation.length > 0 ? (
                      <DeliberationPanel steps={msg.deliberation} />
                    ) : null}

                    <AnswerView content={msg.answer ?? ''} label="최종 답변" />
                    {msg.sources.length > 0 ? (
                      <div className="mt-4 rounded-r border-l-4 border-secondary/50 bg-surface-container-high p-3">
                        <MonoLabel className="mb-2 block text-outline">
                          Sources ({msg.sources.length})
                        </MonoLabel>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((s) => (
                            <button
                              key={s}
                              type="button"
                              className="flex items-center gap-1 border border-outline-variant bg-surface px-2 py-1 text-xs hover:border-secondary"
                            >
                              <Icon name="link" className="text-sm" />
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] text-outline">
                      {msg.mode ? (
                        <span className="rounded border border-white/15 px-1.5 py-0.5 text-secondary">
                          mode: {msg.mode}
                        </span>
                      ) : null}
                      <span>Route: {msg.routeReason}</span>
                      <span>Latency: {msg.latencyMs}ms</span>
                      {msg.fallbackUsed ? <span className="text-tertiary">Fallback used</span> : null}
                    </div>
                  </div>
                </div>
              ),
            )}

            {mutation.isPending ? (
              <div className="rounded border border-secondary/30 bg-deep-gunmetal/80 px-4 py-3 font-mono text-xs text-secondary">
                {selectedModel === 'auto'
                  ? 'Round 1 초안 수집 중… (멀티 LLM 협의)'
                  : 'LLM 응답 생성 중…'}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded border border-error/40 bg-error-container/20 px-4 py-3 text-sm text-error">
                {errorMessage}
              </div>
            ) : null}

            {lastAssistant ? (
              <div className="rounded border border-white/10 bg-surface-container-low px-4 py-3 font-mono text-[11px] text-on-surface-variant">
                mode: {lastAssistant.mode ?? 'n/a'} · 출처 · 라우팅 · 지연 —{' '}
                {lastAssistant.sources.join(', ') || 'n/a'} · {lastAssistant.routeReason} ·{' '}
                {lastAssistant.latencyMs}ms
              </div>
            ) : null}
          </div>

          <form
            className="border-t border-white/5 bg-surface p-4 md:p-6"
            onSubmit={(e) => {
              e.preventDefault()
              if (!input.trim() || mutation.isPending) return
              mutation.mutate(input.trim())
            }}
          >
            <div className="flex items-end gap-3 rounded border border-outline-variant bg-surface-container-lowest p-3 electronic-glow">
              <button type="button" className="text-on-surface-variant hover:text-secondary">
                <Icon name="attach_file" />
              </button>
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="조직 문서에 대해 질문하세요…"
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-outline"
              />
              <Button type="submit" disabled={mutation.isPending || !input.trim()} className="!px-4">
                <Icon name="send" />
                SEND
              </Button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  )
}
