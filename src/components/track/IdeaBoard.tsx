import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { timeAgo } from '@/lib/utils'
import { useProfile } from '@/hooks/useProfile'

export interface IdeaLink {
  url: string
  label: string
  text?: string
  at?: string
  /** Username of who posted it (older entries predate this field). */
  author?: string
}

interface IdeaBoardProps {
  ideas: IdeaLink[]
  onChange: (ideas: IdeaLink[]) => void
}

/**
 * Ideas must be backed by a reference. Posting merges the idea text and the
 * reference URL into a single entry, and the Post button stays disabled until
 * both are provided — so every idea ships with something to back it up.
 * Feed cards stay quiet (two-line clamp, meta in one small row); clicking the
 * text expands the full idea.
 */
export function IdeaBoard({ ideas, onChange }: IdeaBoardProps) {
  const { profile } = useProfile()
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')

  const canPost = text.trim().length > 0 && url.trim().length > 0

  const post = () => {
    if (!canPost) return
    const entry: IdeaLink = {
      text: text.trim(),
      url: url.trim(),
      label: label.trim() || url.trim(),
      at: new Date().toISOString(),
      author: profile?.username,
    }
    onChange([...ideas, entry])
    setText('')
    setUrl('')
    setLabel('')
  }

  const remove = (i: number) => onChange(ideas.filter((_, idx) => idx !== i))

  return (
    <div id="idea-board" className="card-glass border border-line/[0.06] rounded-xl p-4">
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Idea Board</h3>
        <p className="text-[11px] text-faint mt-0.5">Every idea needs a reference to back it.</p>
      </div>

      {/* Posted ideas — quiet rows; click the text to expand */}
      {ideas.length > 0 && (
        <div id="idea-board-list" className="space-y-1.5">
          {ideas.map((idea, i) => (
            <IdeaCard key={i} index={i} idea={idea} onRemove={() => remove(i)} />
          ))}
        </div>
      )}

      {/* Composer — visually its own zone below the feed */}
      <div id="idea-board-composer" className={`space-y-2 ${ideas.length > 0 ? 'mt-4 pt-4 border-t border-line/[0.08]' : ''}`}>
        <p className="text-[11px] font-medium text-faint uppercase tracking-wide">New idea</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe the idea — a concept, lyric, direction…"
          rows={3}
          className="w-full field-glass border border-line/10 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-accent resize-none"
        />
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-32 field-glass border border-line/10 rounded-lg px-2 py-1.5 text-xs text-ink placeholder:text-faint focus:outline-none focus:border-accent"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Reference URL (required)"
            onKeyDown={(e) => e.key === 'Enter' && post()}
            className="flex-1 field-glass border border-line/10 rounded-lg px-2 py-1.5 text-xs text-ink placeholder:text-faint focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">{canPost ? 'Ready to post' : 'Add an idea + a reference link'}</span>
          <Button size="sm" onClick={post} disabled={!canPost}>Post as an idea</Button>
        </div>
      </div>
    </div>
  )
}

function IdeaCard({ idea, index, onRemove }: { idea: IdeaLink; index: number; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div id={`idea-${index}`} className="group px-3 py-2.5 rounded-lg bg-line/[0.03] hover:bg-line/[0.05] transition-colors">
      {idea.text && (
        <p
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Collapse' : 'Show full idea'}
          className={`text-sm text-ink-soft leading-relaxed cursor-pointer ${expanded ? '' : 'line-clamp-2'}`}
        >
          {idea.text}
        </p>
      )}
      <div className="flex items-center gap-2 mt-1.5 min-w-0 text-[11px]">
        {idea.author && <span className="font-medium text-muted flex-shrink-0">{idea.author}</span>}
        <a
          href={idea.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline truncate"
        >
          {idea.label || idea.url}
        </a>
        <span className="flex-1" />
        {idea.at && <span className="text-faint flex-shrink-0">{timeAgo(idea.at)}</span>}
        <button
          onClick={onRemove}
          className="text-faint hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          title="Remove idea"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
