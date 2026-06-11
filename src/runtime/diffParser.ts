import type { DiffChunk, DiffFile, DiffLine } from '../types'

export function parseRawDiff(rawDiff: string): DiffFile[] {
  if (!rawDiff.trim()) return []

  const files: DiffFile[] = []
  const lines = rawDiff.split('\n')
  let currentPath = ''
  let currentChunks: DiffChunk[] = []
  let currentChunkLines: DiffLine[] = []
  let currentHeader = ''
  let additions = 0
  let deletions = 0

  function flushChunk(): void {
    if (currentHeader && currentChunkLines.length > 0) {
      currentChunks.push({
        header: currentHeader,
        lines: currentChunkLines,
      })
      currentChunkLines = []
    }
  }

  function flushFile(): void {
    flushChunk()
    if (currentPath) {
      files.push({
        path: currentPath,
        additions,
        deletions,
        chunks: currentChunks,
      })
    }
    currentPath = ''
    currentChunks = []
    currentHeader = ''
    additions = 0
    deletions = 0
  }

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      flushFile()
      continue
    }
    if (line.startsWith('+++ b/')) {
      currentPath = line.slice('+++ b/'.length).trim()
      continue
    }
    if (line.startsWith('@@')) {
      flushChunk()
      currentHeader = line
      continue
    }
    if (!currentPath) continue

    if (line.startsWith('+') && !line.startsWith('+++')) {
      currentChunkLines.push({ type: 'add', content: line.slice(1) })
      additions += 1
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      currentChunkLines.push({ type: 'remove', content: line.slice(1) })
      deletions += 1
    } else {
      currentChunkLines.push({ type: 'context', content: line.startsWith(' ') ? line.slice(1) : line })
    }
  }

  flushFile()
  return files
}
