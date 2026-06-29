import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { timeAgo } from '@/lib/utils'

export interface IdeaLink {
  url: string
  label: string
  text?: string
  at?: string
}

interface IdeaBoardProps {
  ideas: IdeaLink[]
  onChange: (ideas: IdeaLink[]) => void
}

/**
 * Ideas must be backed by a reference. Posting merges the idea text and the
 * reference URL into a single entry, and the Post button stays disabled until
 * both are provided — so every idea ships with something to back it up.
 */
export function IdeaBoard({ ideas, onChange }: IdeaBoardProps) {
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
    }
    onChange([...ideas, entry])
    setText('')
    setUrl('')
    setLabel('')
  }

  const remove = (i: number) => onChange(ideas.filter((_, idx) => idx !== i))

  return (
    <div id="idea-board" className="card-glass border border-black/[0.06] rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-[#6b6275] uppercase tracking-wider">Idea Board</h3>
        <p className="text-[11px] text-[#9a8fa3] mt-0.5">Every idea needs a reference to back it.</p>
      </div>

      {/* Posted ideas */}
      {ideas.length > 0 && (
        <div id="idea-board-list" className="space-y-2">
          {ideas.map((idea, i) => (
            <div key={i} id={`idea-${i}`} className="p-3 rounded-lg field-glass border border-black/[0.06]">
              {idea.text && <p className="text-sm text-[#2a2433] leading-relaxed mb-1.5">{idea.text}</p>}
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-spectrum-warm flex-shrink-0" />
                <a
                  href={idea.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline truncate flex-1"
                >
                  {idea.label || idea.url}
                </a>
                {idea.at && <span className="text-[10px] text-[#9a8fa3] flex-shrink-0">{timeAgo(idea.at)}</span>}
                <button onClick={() => remove(i)} className="text-[#9a8fa3] hover:text-red-500 transition-colors flex-shrink-0" title="Remove idea">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <div id="idea-board-composer" className="space-y-2 pt-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe the idea — a concept, lyric, direction…"
          rows={3}
          className="w-full field-glass border border-black/10 rounded-lg px-3 py-2 text-sm text-[#1a1620] placeholder:text-[#9a8fa3] focus:outline-none focus:border-accent resize-none"
        />
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-32 field-glass border border-black/10 rounded-lg px-2 py-1.5 text-xs text-[#1a1620] placeholder:text-[#9a8fa3] focus:outline-none focus:border-accent"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Reference URL (required)"
            onKeyDown={(e) => e.key === 'Enter' && post()}
            className="flex-1 field-glass border border-black/10 rounded-lg px-2 py-1.5 text-xs text-[#1a1620] placeholder:text-[#9a8fa3] focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#6b6275]">{canPost ? 'Ready to post' : 'Add an idea + a reference link'}</span>
          <Button size="sm" onClick={post} disabled={!canPost}>Post as an idea</Button>
        </div>
      </div>
    </div>
  )
}
