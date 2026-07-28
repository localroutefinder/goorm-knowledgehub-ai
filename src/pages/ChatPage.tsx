import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/shell/AppShell'
import { AnswerView } from '@/components/ui/AnswerView'
import { Icon } from '@/components/ui/Icon'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { Button } from '@/components/ui/Button'
import { fetchChatHistory, sendChat } from '@/services/api'
import {
  createSession,
  deleteSession,
  ensureActiveSession,
  listSessions,
  selectSession,
} from '@/services/chatSessions'
import { useAppStore } from '@/store/AppStore'
import type { ChatSession, DeliberationStep, LlmModel } from '@/types'

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

const promptExamples: { title: string; prompt: string }[] = [
  {
    title: '모델의 자기인식',
    prompt:
      '기업의 인사(HR) 부서를 위한 AI 업무비서를 구축하려고 합니다. AI 모델로서 귀하의 강점을 활용하여 가장 효과적인 구현 전략을 제안해 주세요.',
  },
  {
    title: 'RAG 기술명세서',
    prompt:
      'React + Vite 기반으로 조직용 RAG 챗봇을 구현하려고 합니다. 프로젝트 폴더 구조, API 설계, TypeScript 인터페이스, 구현 순서를 포함한 기술명세서를 작성해 주세요.',
  },
  {
    title: '복잡한 개념참조',
    prompt:
      'Claude’s Constitution 문서를 분석하여 핵심 내용을 요약하고, 사용자들이 가장 자주 질문할 만한 내용을 FAQ 형식으로 정리한 뒤 개선이 필요한 부분까지 제안해 주세요.\nhttps://www.anthropic.com/constitution',
  },
  {
    title: '다양한 요구반영',
    prompt:
      "AI 입문자를 대상으로 'RAG와 AI 에이전트의 차이'를 이해하기 쉽게 설명해 주세요. 실생활 비유, 단계별 그림 설명, 발표 슬라이드 구성, 실습 아이디어까지 포함해 주세요.",
  },
  {
    title: '최신성 정보참조',
    prompt:
      '2026년 기준 가장 많이 활용되는 RAG 프레임워크와 AI 에이전트 프레임워크를 조사하여 기능, 장단점, 사용 사례를 비교하고 신뢰할 수 있는 출처를 함께 제시해 주세요.',
  },
]

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

function formatSessionTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

function SourceChip({ source }: { source: string }) {
  const label = isHttpUrl(source)
    ? (() => {
        try {
          return new URL(source).hostname.replace(/^www\./, '')
        } catch {
          return source
        }
      })()
    : source

  if (isHttpUrl(source)) {
    return (
      <a
        href={source}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 border border-outline-variant bg-surface px-2 py-1 text-xs hover:border-secondary hover:text-secondary"
        title={source}
      >
        <Icon name="link" className="text-sm" />
        {label}
      </a>
    )
  }

  return (
    <span
      className="flex items-center gap-1 border border-outline-variant bg-surface px-2 py-1 text-xs"
      title={source}
    >
      <Icon name="description" className="text-sm" />
      {label}
    </span>
  )
}

function SessionListPanel({
  sessions,
  activeId,
  workspaceId,
  onSelect,
  onNew,
  onDelete,
}: {
  sessions: ChatSession[]
  activeId: string | null
  workspaceId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <MonoLabel className="text-outline">Chats</MonoLabel>
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-1 rounded border border-secondary/40 bg-secondary/10 px-2 py-1 font-mono text-[10px] uppercase text-secondary hover:bg-secondary/20"
        >
          <Icon name="add" className="text-sm" />
          New
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="px-1 font-mono text-[11px] text-outline">대화가 없습니다.</p>
        ) : (
          sessions.map((s) => {
            const active = s.id === activeId
            return (
              <div
                key={s.id}
                className={`group flex items-start gap-1 rounded border px-2 py-2 transition ${
                  active
                    ? 'border-secondary/50 bg-secondary/10'
                    : 'border-transparent hover:border-white/10 hover:bg-surface-variant/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-xs font-medium text-on-surface">{s.title}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-outline">
                    {formatSessionTime(s.updatedAt)}
                  </p>
                </button>
                <button
                  type="button"
                  title="삭제"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(s.id)
                  }}
                  className="shrink-0 p-1 text-outline opacity-60 hover:text-error group-hover:opacity-100"
                >
                  <Icon name="delete" className="text-sm" />
                </button>
              </div>
            )
          })
        )}
      </div>
      <MonoLabel className="mt-4 block text-[10px] text-outline">
        Workspace: {workspaceId}
      </MonoLabel>
    </div>
  )
}

export function ChatPage() {
  const {
    selectedModel,
    setModel,
    selectedWorkspaceId,
    generationPrefs,
    setGenerationPrefs,
  } = useAppStore()
  const [input, setInput] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['chat-sessions', selectedWorkspaceId],
    queryFn: () => {
      const list = listSessions(selectedWorkspaceId)
      if (list.length === 0) {
        const s = createSession(selectedWorkspaceId)
        return [s]
      }
      return list
    },
  })

  useEffect(() => {
    const active = ensureActiveSession(selectedWorkspaceId)
    setActiveSessionId(active.id)
  }, [selectedWorkspaceId, sessions])

  useEffect(() => {
    if (searchParams.get('new') !== '1') return
    const s = createSession(selectedWorkspaceId)
    setActiveSessionId(s.id)
    setInput('')
    void refetchSessions()
    queryClient.setQueryData(['chat', selectedWorkspaceId, s.id], [])
    setSearchParams({}, { replace: true })
    setDrawerOpen(false)
  }, [
    searchParams,
    selectedWorkspaceId,
    refetchSessions,
    queryClient,
    setSearchParams,
  ])

  const sessionId = activeSessionId

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', selectedWorkspaceId, sessionId],
    queryFn: () => fetchChatHistory(selectedWorkspaceId, sessionId ?? undefined),
    enabled: Boolean(sessionId),
  })

  const mutation = useMutation({
    mutationFn: (q: string) =>
      sendChat(
        q,
        selectedModel,
        messages,
        selectedWorkspaceId,
        sessionId ?? undefined,
        generationPrefs,
      ),
    onSuccess: (data) => {
      if (sessionId) {
        queryClient.setQueryData(['chat', selectedWorkspaceId, sessionId], data)
      }
      void refetchSessions()
      setInput('')
    },
  })

  function handleNewChat() {
    const s = createSession(selectedWorkspaceId)
    setActiveSessionId(s.id)
    setInput('')
    void refetchSessions()
    queryClient.setQueryData(['chat', selectedWorkspaceId, s.id], [])
    setDrawerOpen(false)
  }

  function handleSelect(id: string) {
    selectSession(selectedWorkspaceId, id)
    setActiveSessionId(id)
    setDrawerOpen(false)
  }

  function handleDelete(id: string) {
    const next = deleteSession(selectedWorkspaceId, id)
    void refetchSessions()
    if (next) {
      setActiveSessionId(next.id)
    } else {
      const s = createSession(selectedWorkspaceId)
      setActiveSessionId(s.id)
      queryClient.setQueryData(['chat', selectedWorkspaceId, s.id], [])
      void refetchSessions()
    }
  }

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
      <div className="relative flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
        {/* Desktop session panel */}
        <aside className="hidden w-64 shrink-0 overflow-hidden border-r border-white/5 bg-deep-gunmetal/80 xl:block">
          <SessionListPanel
            sessions={sessions}
            activeId={sessionId}
            workspaceId={selectedWorkspaceId}
            onSelect={handleSelect}
            onNew={handleNewChat}
            onDelete={handleDelete}
          />
        </aside>

        {/* Mobile slide overlay */}
        {drawerOpen ? (
          <div className="absolute inset-0 z-40 xl:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close sessions"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 border-r border-white/10 bg-deep-gunmetal shadow-xl">
              <SessionListPanel
                sessions={sessions}
                activeId={sessionId}
                workspaceId={selectedWorkspaceId}
                onSelect={handleSelect}
                onNew={handleNewChat}
                onDelete={handleDelete}
              />
            </aside>
          </div>
        ) : null}

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-outline-variant bg-deep-gunmetal/50 p-4 md:p-6">
            <div className="mb-3 flex items-center gap-2 xl:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="rounded border border-outline-variant p-2 text-on-surface-variant hover:border-secondary hover:text-secondary"
                title="채팅 목록"
              >
                <Icon name="menu" />
              </button>
              <MonoLabel className="truncate text-outline">
                {sessions.find((s) => s.id === sessionId)?.title ?? '채팅'}
              </MonoLabel>
            </div>
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

            <div className="mt-4 rounded border border-white/10 bg-surface-container-lowest/60">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2 text-left"
              >
                <MonoLabel className="text-outline">
                  Enterprise · Temp {generationPrefs.temperature.toFixed(1)} · Max{' '}
                  {generationPrefs.maxTokens}
                  {generationPrefs.includeWebSearch ? ' · Web' : ''}
                  {generationPrefs.systemInstructions.trim() ? ' · Sys' : ''}
                </MonoLabel>
                <Icon
                  name={advancedOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                  className="text-sm text-outline"
                />
              </button>
              {advancedOpen ? (
                <div className="space-y-4 border-t border-white/5 px-3 py-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block space-y-1">
                      <MonoLabel className="text-outline">
                        Temperature · {generationPrefs.temperature.toFixed(2)}
                      </MonoLabel>
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.05}
                        value={generationPrefs.temperature}
                        onChange={(e) =>
                          setGenerationPrefs({ temperature: Number(e.target.value) })
                        }
                        className="w-full accent-secondary"
                      />
                    </label>
                    <label className="block space-y-1">
                      <MonoLabel className="text-outline">
                        Max Tokens · {generationPrefs.maxTokens}
                      </MonoLabel>
                      <input
                        type="range"
                        min={256}
                        max={4096}
                        step={64}
                        value={generationPrefs.maxTokens}
                        onChange={(e) =>
                          setGenerationPrefs({ maxTokens: Number(e.target.value) })
                        }
                        className="w-full accent-secondary"
                      />
                    </label>
                  </div>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded border border-white/5 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Web grounding</p>
                      <p className="text-[11px] text-outline">
                        Google Search / Perplexity 인용 · 웹 링크 근거
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={generationPrefs.includeWebSearch}
                      onClick={() =>
                        setGenerationPrefs({
                          includeWebSearch: !generationPrefs.includeWebSearch,
                        })
                      }
                      className={`relative h-7 w-12 rounded-sm border transition ${
                        generationPrefs.includeWebSearch
                          ? 'border-secondary bg-secondary-container/30'
                          : 'border-outline-variant bg-surface-container-lowest'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-sm bg-brushed-silver transition ${
                          generationPrefs.includeWebSearch
                            ? 'left-6 bg-secondary-container'
                            : 'left-0.5'
                        }`}
                      />
                    </button>
                  </label>
                  <label className="block space-y-1">
                    <MonoLabel className="text-outline">System instructions</MonoLabel>
                    <textarea
                      rows={3}
                      value={generationPrefs.systemInstructions}
                      onChange={(e) =>
                        setGenerationPrefs({ systemInstructions: e.target.value })
                      }
                      placeholder="예: 답변은 불릿으로, 규정 인용 시 조항을 명시하세요."
                      className="w-full resize-y rounded border border-outline-variant bg-surface px-3 py-2 text-sm outline-none placeholder:text-outline focus:border-secondary"
                    />
                  </label>
                </div>
              ) : null}
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
                <br />
                <span className="mt-2 inline-block font-mono text-[11px] text-outline">
                  아래 Prompt 뱃지로 모델 특성 차이를 테스트할 수 있습니다.
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
                            <SourceChip key={s} source={s} />
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
            <div className="mb-3 flex items-center gap-2">
              <MonoLabel className="shrink-0 text-outline">Prompt</MonoLabel>
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
                {promptExamples.map((ex) => (
                  <button
                    key={ex.title}
                    type="button"
                    title={ex.prompt}
                    onClick={() => setInput(ex.prompt)}
                    className="shrink-0 rounded border border-outline-variant bg-surface-container-high px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-on-surface-variant transition hover:border-secondary hover:text-secondary"
                  >
                    {ex.title}
                  </button>
                ))}
              </div>
            </div>
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
