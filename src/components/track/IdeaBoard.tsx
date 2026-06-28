import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface IdeaLink {
  url: string
  label: string
}

interface IdeaBoardProps {
  notes: string | null
  links: IdeaLink[]
  onNotesChange: (notes: string) => void
  onLinksChange: (links: IdeaLink[]) => void
}

export function IdeaBoard({ notes, links, onNotesChange, onLinksChange }: IdeaBoardProps) {
  const [localNotes, setLocalNotes] = useState(notes ?? '')
  const [newUrl, setNewUrl] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleNotesChange = (value: string) => {
    setLocalNotes(value)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onNotesChange(value), 800)
  }

  const addLink = () => {
    if (!newUrl.trim()) return
    onLinksChange([...links, { url: newUrl.trim(), label: newLabel.trim() || newUrl.trim() }])
    setNewUrl('')
    setNewLabel('')
  }

  const removeLink = (index: number) => {
    onLinksChange(links.filter((_, i) => i !== index))
  }

  return (
    <div id="idea-board" className="border border-white/8 rounded-xl p-4 space-y-4 bg-surface-2">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Idea Board</h3>

      <textarea
        id="idea-board-notes"
        value={localNotes}
        onChange={(e) => handleNotesChange(e.target.value)}
        placeholder="Jot down lyrics, concepts, references, anything..."
        rows={5}
        className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent resize-none"
      />

      <div id="idea-board-links" className="space-y-2">
        <p className="text-xs text-muted font-medium">Reference Links</p>

        {links.length > 0 && (
          <div id="idea-board-links-list" className="space-y-1">
            {links.map((link, i) => (
              <div key={i} id={`idea-link-${i}`} className="flex items-center gap-2 text-xs py-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-accent hover:underline truncate"
                >
                  {link.label}
                </a>
                <button
                  onClick={() => removeLink(i)}
                  className="text-muted hover:text-red-400 transition-colors flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div id="idea-board-add-link" className="flex gap-2">
          <input
            id="idea-board-link-label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-32 bg-surface-3 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <input
            id="idea-board-link-url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Paste URL"
            onKeyDown={(e) => e.key === 'Enter' && addLink()}
            className="flex-1 bg-surface-3 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <Button size="sm" variant="ghost" onClick={addLink}>Add</Button>
        </div>
      </div>
    </div>
  )
}
