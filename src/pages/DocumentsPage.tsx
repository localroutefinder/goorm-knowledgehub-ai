import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/shell/AppShell'
import { MetallicCard } from '@/components/ui/MetallicCard'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { SearchField } from '@/components/ui/SearchField'
import { fetchDocuments, fetchWorkspaces, uploadDocument } from '@/services/api'
import { useAppStore } from '@/store/AppStore'
import type { DocumentItem } from '@/types'

function detectType(filename: string): DocumentItem['type'] {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.md')) return 'md'
  if (lower.endsWith('.pdf')) return 'pdf'
  return 'txt'
}

export function DocumentsPage() {
  const { selectedWorkspaceId } = useAppStore()
  const [query, setQuery] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => fetchDocuments(),
  })
  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
  })

  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: async () => {
      setUploadError(null)
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (err) => {
      setUploadError(err instanceof Error ? err.message : String(err))
    },
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return docs.filter((d) => {
      const wsOk = !selectedWorkspaceId || d.workspaceId === selectedWorkspaceId
      const qOk = !q || d.filename.toLowerCase().includes(q)
      return wsOk && qOk
    })
  }, [docs, query, selectedWorkspaceId])

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    const file = fileList[0]
    const text = await file.text()
    uploadMutation.mutate({
      workspaceId: selectedWorkspaceId || 'ws-hr',
      filename: file.name,
      content: text,
      type: detectType(file.name),
      accessLevel: 'workspace',
    })
  }

  return (
    <AppShell title="Documents">
      <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 md:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-black uppercase metallic-title">
              Document Repository
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              TXT/MD/PDF(텍스트) 업로드 → Neon 청킹·임베딩·인덱싱
            </p>
          </div>
          <div className="flex gap-2">
            <SearchField value={query} onChange={setQuery} className="w-56" />
            <Button
              className="text-xs"
              onClick={() => inputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              <Icon name="upload_file" />
              Upload
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md,.pdf,.markdown"
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            void handleFiles(e.dataTransfer.files)
          }}
          className={`relative rounded border-2 border-dashed p-10 text-center transition ${
            dragOver
              ? 'border-secondary bg-secondary-container/10'
              : 'border-outline-variant bg-surface-container-low'
          }`}
        >
          <Icon name="cloud_upload" className="mb-3 text-5xl text-secondary" />
          <p className="font-display text-lg font-bold">
            {uploadMutation.isPending ? 'Indexing to Neon…' : 'Drop files to index'}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Workspace: {selectedWorkspaceId || 'ws-hr'} · OpenAI embedding · Chat에서 RAG
            근거로 사용
          </p>
          {uploadError ? (
            <p className="mt-3 text-sm text-error">{uploadError}</p>
          ) : null}
          <div className="fallback-stripe absolute inset-x-0 bottom-0 h-1.5 opacity-70" />
        </div>

        <MetallicCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <MonoLabel className="text-outline">
              Active Documents {isLoading ? '…' : `(${filtered.length})`}
            </MonoLabel>
            <div className="flex gap-2">
              <StatusBadge status="indexed" />
              <StatusBadge status="syncing" />
              <StatusBadge status="failed" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface-container-high font-mono text-[11px] uppercase tracking-wider text-outline">
                <tr>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Size</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const ws = workspaces.find((w) => w.id === doc.workspaceId)
                  return (
                    <tr key={doc.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon
                            name={doc.type === 'pdf' ? 'picture_as_pdf' : 'article'}
                            className="text-secondary"
                          />
                          <div>
                            <p className="font-medium">{doc.filename}</p>
                            <MonoLabel className="text-outline">{doc.uploadedBy}</MonoLabel>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {ws?.department ?? doc.workspaceId}
                      </td>
                      <td className="px-4 py-3">
                        <MonoLabel>{doc.accessLevel}</MonoLabel>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-outline">
                        {doc.sizeLabel}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </MetallicCard>
      </div>
    </AppShell>
  )
}
