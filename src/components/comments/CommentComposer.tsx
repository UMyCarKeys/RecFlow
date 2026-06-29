import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { useAuth } from '@/hooks/useAuth'
import { usePlayerStore } from '@/store/playerStore'
import { formatDuration } from '@/lib/utils'
import { displayName } from '@/lib/displayName'
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
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !body.trim()) return
    setLoading(true)
    await onSubmit(body.trim(), user.id, {
      parentId,
      timestampS: pin && activeVersionId ? progress : undefined,
      task: taskOn ? { label: label.trim(), assigneeId: assignee || null } : undefined,
    })
    setBody('')
    setPin(false)
    setTaskOn(false)
    setLabel('')
    setAssignee('')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full field-glass border border-black/10 rounded-lg px-3 py-2 text-sm text-[#1a1620] placeholder:text-[#9a8fa3] focus:outline-none focus:border-accent resize-none"
      />

      {showTaskOption && taskOn && (
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Task label (optional)"
            className="flex-1 field-glass border border-black/10 rounded-lg px-3 py-1.5 text-sm text-[#1a1620] placeholder:text-[#9a8fa3] focus:outline-none focus:border-accent"
          />
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="field-glass border border-black/10 rounded-lg px-2 py-1.5 text-sm text-[#1a1620] focus:outline-none focus:border-accent"
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
          {activeVersionId && !parentId && (
            <label className="flex items-center gap-2 text-xs text-[#6b6275] cursor-pointer">
              <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} className="accent-accent" />
              Pin {formatDuration(progress)}
            </label>
          )}
          {showTaskOption && <Switch checked={taskOn} onChange={setTaskOn} label="Task" />}
        </div>
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
