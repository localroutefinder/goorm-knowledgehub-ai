import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/shell/AppShell'
import { MetallicCard } from '@/components/ui/MetallicCard'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { fetchSettings } from '@/services/api'
import type { LlmModel } from '@/types'

const labels: Record<string, string> = {
  gpt: 'OpenAI GPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
}

export function SettingsPage() {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  })

  const [order, setOrder] = useState<LlmModel[]>(['gpt', 'claude', 'gemini', 'perplexity'])
  const [autoMode, setAutoMode] = useState(true)
  const [latencyOpt, setLatencyOpt] = useState(true)
  const [compression, setCompression] = useState(false)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (!data) return
    setOrder(data.fallbackOrder.filter((m): m is LlmModel => m !== 'auto'))
    setAutoMode(data.autoMode)
    setLatencyOpt(data.latencyOpt)
    setCompression(data.contextCompression)
  }, [data])

  function move(index: number, dir: -1 | 1) {
    const next = [...order]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
  }

  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-[960px] space-y-8 px-4 py-8 md:px-10">
        <div>
          <div className="mb-4 flex gap-4 border-b border-white/5 pb-3 font-mono text-xs uppercase tracking-wider">
            <span className="text-on-surface-variant">Environment</span>
            <span className="border-b-2 border-secondary pb-3 text-secondary">Model Config</span>
            <span className="text-on-surface-variant">Billing</span>
          </div>
          <h2 className="font-display text-3xl font-black uppercase metallic-title">
            Orchestration Config
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Fallback 우선순위 · Auto Mode · API 키 (서버 환경변수로 이전 예정)
          </p>
        </div>

        <MetallicCard className="overflow-hidden p-0">
          <div className="fallback-stripe h-2" />
          <div className="space-y-4 p-6">
            <h3 className="font-display text-lg font-bold">Model Fallback Priority</h3>
            <ul className="space-y-2">
              {order.map((model, index) => (
                <li
                  key={model}
                  className="flex items-center gap-3 rounded border border-white/5 bg-surface-variant/20 p-3"
                >
                  <MonoLabel className="w-8 text-secondary">#{index + 1}</MonoLabel>
                  <Icon name="drag_indicator" className="text-outline" />
                  <span className="flex-1 font-medium">{labels[model] ?? model}</span>
                  <div className="h-2 w-24 overflow-hidden rounded-sm bg-surface-container-lowest">
                    <div
                      className="h-full bg-secondary-container"
                      style={{ width: `${90 - index * 15}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    className="text-on-surface-variant hover:text-secondary"
                    onClick={() => move(index, -1)}
                  >
                    <Icon name="keyboard_arrow_up" />
                  </button>
                  <button
                    type="button"
                    className="text-on-surface-variant hover:text-secondary"
                    onClick={() => move(index, 1)}
                  >
                    <Icon name="keyboard_arrow_down" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </MetallicCard>

        <MetallicCard className="space-y-4 p-6">
          <h3 className="font-display text-lg font-bold">Auto Optimization</h3>
          {[
            {
              label: 'Auto Mode preferred',
              desc: '질문 유형·신뢰도·비용으로 모델 자동 선택',
              value: autoMode,
              set: setAutoMode,
            },
            {
              label: 'Latency optimization',
              desc: '지연 허용 범위 내 경량 모델 우선',
              value: latencyOpt,
              set: setLatencyOpt,
            },
            {
              label: 'Context compression',
              desc: '긴 문서 컨텍스트 압축 후 전달',
              value: compression,
              set: setCompression,
            },
          ].map((opt) => (
            <label
              key={opt.label}
              className="flex cursor-pointer items-center justify-between gap-4 rounded border border-white/5 p-3 hover:bg-white/5"
            >
              <div>
                <p className="font-medium">{opt.label}</p>
                <p className="text-xs text-on-surface-variant">{opt.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={opt.value}
                onClick={() => opt.set(!opt.value)}
                className={`relative h-7 w-12 rounded-sm border transition ${
                  opt.value
                    ? 'border-secondary bg-secondary-container/30'
                    : 'border-outline-variant bg-surface-container-lowest'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-sm bg-brushed-silver transition ${
                    opt.value ? 'left-6 bg-secondary-container' : 'left-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
        </MetallicCard>

        <MetallicCard className="space-y-4 p-6">
          <h3 className="font-display text-lg font-bold">API Integration</h3>
          <p className="text-xs text-outline">데모용 필드 — 실제 키는 서버리스 환경변수에만 보관</p>
          {['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'PERPLEXITY_API_KEY'].map(
            (key) => (
              <label key={key} className="block space-y-1">
                <MonoLabel className="text-outline">{key}</MonoLabel>
                <div className="electronic-glow flex items-center gap-2 rounded border border-outline-variant bg-surface-container-lowest px-3 py-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    defaultValue="••••••••••••••••"
                    className="w-full bg-transparent font-mono text-sm outline-none"
                    readOnly
                  />
                  <button type="button" onClick={() => setShowKey((v) => !v)}>
                    <Icon name={showKey ? 'visibility_off' : 'visibility'} />
                  </button>
                </div>
              </label>
            ),
          )}
          <Button className="mt-2">Save Configuration</Button>
        </MetallicCard>
      </div>
    </AppShell>
  )
}
