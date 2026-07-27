export function chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const paragraphs = normalized.split(/\n{2,}/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    const piece = para.trim()
    if (!piece) continue

    if ((current + '\n\n' + piece).length <= chunkSize) {
      current = current ? `${current}\n\n${piece}` : piece
      continue
    }

    if (current) chunks.push(current)

    if (piece.length <= chunkSize) {
      current = piece
      continue
    }

    for (let i = 0; i < piece.length; i += chunkSize - overlap) {
      chunks.push(piece.slice(i, i + chunkSize))
    }
    current = ''
  }

  if (current) chunks.push(current)
  return chunks
}
