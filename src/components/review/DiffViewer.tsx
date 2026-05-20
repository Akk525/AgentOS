import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import type { DiffFile } from '../../types'

interface DiffViewerProps {
  file: DiffFile
}

export function DiffViewer({ file }: DiffViewerProps) {
  let addLineNum = 1
  let removeLineNum = 1

  return (
    <motion.div
      key={file.path}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="font-mono text-[12px] leading-[1.6]"
    >
      {/* File header */}
      <div className="sticky top-0 flex items-center justify-between px-5 py-2.5 bg-[rgba(6,6,10,0.85)] backdrop-blur-sm border-b border-white/[0.05] z-10">
        <span className="text-slate-400">{file.path}</span>
        <div className="flex items-center gap-3">
          <span className="text-emerald-500 font-semibold">+{file.additions}</span>
          <span className="text-crimson-500/80 font-semibold">-{file.deletions}</span>
        </div>
      </div>

      {file.chunks.map((chunk, ci) => (
        <div key={ci}>
          {/* Chunk header */}
          <div className="flex items-center gap-2 px-5 py-1.5 bg-violet-950/20 border-y border-violet-900/20">
            <span className="text-violet-500/50 text-[11px]">{chunk.header}</span>
          </div>

          {/* Lines */}
          {chunk.lines.map((line, li) => {
            if (line.type === 'add') addLineNum++
            if (line.type === 'remove') removeLineNum++

            return (
              <div
                key={li}
                className={cn(
                  'flex items-stretch group',
                  line.type === 'add' && 'bg-emerald-500/[0.07] hover:bg-emerald-500/[0.1]',
                  line.type === 'remove' && 'bg-crimson-500/[0.07] hover:bg-crimson-500/[0.1]',
                  line.type === 'context' && 'hover:bg-white/[0.02]',
                )}
              >
                {/* Marker */}
                <div className={cn(
                  'w-8 flex-shrink-0 flex items-center justify-center text-[10px] select-none border-l-2',
                  line.type === 'add' && 'text-emerald-500/70 border-emerald-500/40',
                  line.type === 'remove' && 'text-crimson-500/70 border-crimson-500/40',
                  line.type === 'context' && 'text-transparent border-transparent',
                )}>
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ''}
                </div>

                {/* Code */}
                <code className={cn(
                  'flex-1 px-4 py-0.5 whitespace-pre-wrap break-all',
                  line.type === 'add' && 'text-emerald-200/90',
                  line.type === 'remove' && 'text-crimson-300/60 line-through',
                  line.type === 'context' && 'text-slate-500',
                )}>
                  {line.content || <span>&nbsp;</span>}
                </code>
              </div>
            )
          })}
        </div>
      ))}

      {/* End spacer */}
      <div className="h-8" />
    </motion.div>
  )
}
