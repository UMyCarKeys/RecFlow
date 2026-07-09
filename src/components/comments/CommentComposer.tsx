import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { useAuth } from '@/hooks/useAuth'
import { usePlayerStore } from '@/store/playerStore'
import { formatDuration } from '@/lib/utils'
import { displayName } from '@/lib/displayName'
import { GifPicker } from '@/components/track/GifPicker'
import { giphyConfigured } from '@/lib/giphy'
import type { AddOpts } from '@/hooks/useThread'
import type { ProjectMember } from '@/types/database'

interface CommentComposerProps {
  onSubmit: (body: string, authorId: string, opts?: AddOpts) => Promise<unknown>
  members?: ProjectMember[]
  parentId?: string
  placeholder?: string
  onCancel?: () => void
  showTaskOption?: boolean
}

export function CommentComposer({
  onSubmit,
  members = [],
  parentId,
  placeholder = 'Add a comment…',
  onCancel,
  showTaskOption = false,
}: CommentComposerProps) {
  const { user } = useAuth()
  const { progress, activeVersionId } = usePlayerStore()
  const [body, setBody] = useState('')
  const [pin, setPin] = useState(false)
  const [taskOn, setTaskOn] = useState(false)
  const [label, setLabel] = useState('')
  const [assignee, setAssignee] = useState('')
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [gifOpen, setGifOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // A GIF alone is a valid comment — body becomes optional when one is attached.
  const canPost = body.trim().length > 0 || !!gifUrl

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !canPost) return
    setLoading(true)
    await onSubmit(body.trim(), user.id, {
      parentId,
      timestampS: pin && activeVersionId ? progress : undefined,
      task: taskOn ? { label: label.trim(), assigneeId: assignee || null } : undefined,
      gifUrl: gifUrl ?? undefined,
    })
    setBody('')
    setPin(false)
    setTaskOn(false)
    setLabel('')
    setAssignee('')
    setGifUrl(null)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full field-glass border border-line/10 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-accent resize-none"
      />

      {/* Attached GIF preview — removable before posting */}
      {gifUrl && (
        <div className="relative inline-block">
          {gifUrl.endsWith('.mp4') ? (
            <video src={gifUrl} autoPlay loop muted playsInline className="h-24 rounded-lg border border-line/10 object-cover" />
          ) : (
            <img src={gifUrl} alt="GIF attachment" className="h-24 rounded-lg border border-line/10 object-cover" />
          )}
          <button
            type="button"
            onClick={() => setGifUrl(null)}
            title="Remove GIF"
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1a1620] text-white text-[10px] leading-none flex items-center justify-center shadow hover:bg-red-500 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {showTaskOption && taskOn && (
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Task label (optional)"
            className="flex-1 field-glass border border-line/10 rounded-lg px-3 py-1.5 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-accent"
          />
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="field-glass border border-line/10 rounded-lg px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
          >
            <option value="">Assign…</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>{displayName(m.profiles)}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {/* GIF — the fun button: spectrum chip that invites a click */}
          {giphyConfigured() && (
            <button
              type="button"
              onClick={() => setGifOpen(true)}
              title="Add a GIF"
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide text-white bg-spectrum-warm shadow-sm hover:scale-110 hover:shadow-[0_2px_10px_rgba(255,138,107,0.45)] active:scale-95 transition-all ${
                gifUrl ? 'ring-2 ring-accent/60' : ''
              }`}
            >
              GIF
            </button>
          )}
          {activeVersionId && !parentId && (
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} className="accent-accent" />
              Pin {formatDuration(progress)}
            </label>
          )}
          {showTaskOption && <Switch checked={taskOn} onChange={setTaskOn} label="Task" />}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {onCancel && <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" size="sm" disabled={!canPost || loading}>
            {loading ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </div>

      <GifPicker open={gifOpen} onClose={() => setGifOpen(false)} onPick={(url) => setGifUrl(url)} />
    </form>
  )
}
