import { useState } from 'react'
import { timeAgo } from '@/lib/utils'
import type { NameHistoryEntry } from '@/types/database'

interface EditableTitleProps {
  value: string
  history: NameHistoryEntry[]
  canEdit: boolean
  onSave: (name: string) => void
  className?: string
}

export function EditableTitle({ value, history, canEdit, onSave, className = '' }: EditableTitleProps) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(value)
  const [showHistory, setShowHistory] = useState(false)

  const save = () => {
    const n = input.trim()
    if (n && n !== value) onSave(n)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') {
            setInput(value)
            setEditing(false)
          }
        }}
        autoFocus
        className={`${className} bg-transparent border-b border-white/20 focus:outline-none focus:border-accent min-w-0`}
      />
    )
  }

  return (
    <div className="group/title flex items-center gap-2 min-w-0">
      <h1 className={`${className} truncate`}>{value}</h1>

      {canEdit && (
        <button
          onClick={() => {
            setInput(value)
            setEditing(true)
          }}
          title="Rename"
          className="text-[#9a8fa3] hover:text-[#1a1620] transition-colors opacity-0 group-hover/title:opacity-100 flex-shrink-0"
        >
          <PencilIcon />
        </button>
      )}

      {history.length > 0 && (
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowHistory((v) => !v)}
            title="Name history"
            className="text-muted hover:text-white transition-colors opacity-0 group-hover/title:opacity-100"
          >
            <ClockIcon />
          </button>
          {showHistory && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)} />
              <div className="absolute left-0 mt-2 w-60 rounded-xl glass-light border border-black/[0.08] shadow-xl p-2 z-50">
                <p className="px-2 py-1 text-xs font-semibold text-[#6b6275] uppercase tracking-wide">Previous names</p>
                {[...history].reverse().map((h, i) => (
                  <div key={i} className="px-2 py-1.5 flex items-center justify-between gap-2">
                    <span className="text-sm text-[#1a1620] truncate">{h.name}</span>
                    <span className="text-[10px] text-[#9a8fa3] flex-shrink-0">{timeAgo(h.at)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11 2l3 3-9 9H2v-3L11 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
