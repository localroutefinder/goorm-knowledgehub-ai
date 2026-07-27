import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { Icon } from '@/components/ui/Icon'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const WEBVIEW_CSS = `
  :root {
    color-scheme: dark;
    --bg: #14171a;
    --fg: #e2e2e5;
    --muted: #cac3d9;
    --accent: #00eefc;
    --border: #484456;
    --code-bg: #1a1c1e;
    --link: #cbbeff;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.65;
  }
  body { padding: 16px 18px 20px; }
  h1, h2, h3, h4 {
    font-family: Montserrat, "Segoe UI", sans-serif;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 1.1em 0 0.45em;
    color: #fff;
  }
  h1 { font-size: 1.35rem; }
  h2 { font-size: 1.15rem; }
  h3 { font-size: 1.02rem; color: var(--accent); }
  p { margin: 0.55em 0; }
  ul, ol { margin: 0.45em 0; padding-left: 1.35em; }
  li { margin: 0.2em 0; }
  strong { color: #fff; font-weight: 700; }
  a { color: var(--link); }
  hr {
    border: 0;
    border-top: 1px solid var(--border);
    margin: 1em 0;
  }
  code {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.86em;
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 0.1em 0.35em;
  }
  pre {
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 12px;
    overflow-x: auto;
  }
  pre code {
    border: 0;
    background: transparent;
    padding: 0;
  }
  blockquote {
    margin: 0.7em 0;
    padding: 0.35em 0 0.35em 0.9em;
    border-left: 3px solid var(--accent);
    color: var(--muted);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.8em 0;
    font-size: 0.92em;
  }
  th, td {
    border: 1px solid var(--border);
    padding: 6px 8px;
    text-align: left;
  }
  th { background: #1f2225; color: var(--accent); }
`

function toHtml(markdown: string): string {
  const raw = marked.parse(markdown || '', { async: false }) as string
  return raw.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
}

function buildSrcDoc(markdown: string): string {
  const body = toHtml(markdown)
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${WEBVIEW_CSS}</style></head><body>${body}</body></html>`
}

type AnswerViewProps = {
  content: string
  label?: string
  compact?: boolean
  defaultMode?: 'web' | 'raw'
}

export function AnswerView({
  content,
  label = '최종 답변',
  compact = false,
  defaultMode = 'web',
}: AnswerViewProps) {
  const [mode, setMode] = useState<'web' | 'raw'>(defaultMode)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const srcDoc = useMemo(() => buildSrcDoc(content), [content])

  useEffect(() => {
    if (mode !== 'web') return
    const iframe = iframeRef.current
    if (!iframe) return

    const resize = () => {
      try {
        const doc = iframe.contentDocument
        if (!doc?.body) return
        const h = Math.max(doc.body.scrollHeight, compact ? 80 : 120)
        iframe.style.height = `${Math.min(h + 8, compact ? 360 : 720)}px`
      } catch {
        /* sandbox */
      }
    }

    iframe.addEventListener('load', resize)
    const t = window.setTimeout(resize, 50)
    return () => {
      iframe.removeEventListener('load', resize)
      window.clearTimeout(t)
    }
  }, [mode, srcDoc, compact])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {label ? <MonoLabel className="text-outline">{label}</MonoLabel> : <span />}
        <div className="flex overflow-hidden rounded border border-outline-variant">
          <button
            type="button"
            onClick={() => setMode('web')}
            className={`flex items-center gap-1 px-2 py-1 font-mono text-[10px] uppercase transition ${
              mode === 'web'
                ? 'bg-secondary-container text-on-secondary'
                : 'text-outline hover:text-secondary'
            }`}
          >
            <Icon name="web" className="text-sm" />
            웹뷰
          </button>
          <button
            type="button"
            onClick={() => setMode('raw')}
            className={`flex items-center gap-1 border-l border-outline-variant px-2 py-1 font-mono text-[10px] uppercase transition ${
              mode === 'raw'
                ? 'bg-surface-container-high text-on-surface'
                : 'text-outline hover:text-secondary'
            }`}
          >
            <Icon name="code" className="text-sm" />
            원문
          </button>
        </div>
      </div>

      {mode === 'web' ? (
        <div className="overflow-hidden rounded border border-white/10 bg-[#14171a]">
          <iframe
            ref={iframeRef}
            title="answer-webview"
            sandbox="allow-same-origin"
            srcDoc={srcDoc}
            className={`w-full border-0 ${compact ? 'min-h-[96px]' : 'min-h-[140px]'}`}
          />
        </div>
      ) : (
        <pre
          className={`overflow-x-auto whitespace-pre-wrap rounded border border-white/10 bg-surface-container-high p-3 font-mono leading-relaxed text-on-surface-variant ${
            compact ? 'text-[11px]' : 'text-xs'
          }`}
        >
          {content}
        </pre>
      )}
    </div>
  )
}
