import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { usePlayerStore } from '@/store/playerStore'
import { formatDuration } from '@/lib/utils'

interface CommentComposerProps {
  onSubmit: (body: string, authorId: string, parentId?: string, timestampS?: number) => Promise<unknown>
  parentId?: string
  placeholder?: string
  onCancel?: () => void
}

export function CommentComposer({ onSubmit, parentId, placeholder = 'Add a comment…', onCancel }: CommentComposerProps) {
  const { user } = useAuth()
  const { progress, activeVersionId } = usePlayerStore()
  const [body, setBody] = useState('')
  const [pinTimestamp, setPinTimestamp] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !body.trim()) return
    setLoading(true)
    await onSubmit(body.trim(), user.id, parentId, pinTimestamp && activeVersionId ? progress : undefined)
    setBody('')
    setPinTimestamp(false)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent resize-none"
      />
      <div className="flex items-center justify-between">
        {activeVersionId && !parentId && (
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={pinTimestamp}
              onChange={(e) => setPinTimestamp(e.target.checked)}
              className="accent-accent"
            />
            Pin to {formatDuration(progress)}
          </label>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {onCancel && <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" size="sm" disabled={!body.trim() || loading}>
            {loading ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </div>
    </form>
  )
}
