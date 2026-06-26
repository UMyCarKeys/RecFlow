import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import type { ProjectMember } from '@/types/database'

interface TaskComposerProps {
  onSubmit: (title: string, body: string, assigneeId: string | null, projectId: string, createdBy: string) => Promise<unknown>
  projectId: string
  members: ProjectMember[]
}

export function TaskComposer({ onSubmit, projectId, members }: TaskComposerProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim()) return
    setLoading(true)
    await onSubmit(title.trim(), body.trim(), assigneeId || null, projectId, user.id)
    setTitle('')
    setBody('')
    setAssigneeId('')
    setLoading(false)
    setOpen(false)
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        + Add task
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-3 bg-surface-3 rounded-lg border border-white/8">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
        required
        autoFocus
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Details (optional)"
        rows={2}
        className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent resize-none"
      />
      <select
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
        className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.user_id} value={m.user_id}>{m.profiles?.username ?? m.user_id}</option>
        ))}
      </select>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="submit" size="sm" disabled={!title.trim() || loading}>
          {loading ? 'Adding…' : 'Add task'}
        </Button>
      </div>
    </form>
  )
}
