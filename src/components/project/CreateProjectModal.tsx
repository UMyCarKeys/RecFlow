import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateProjectModal({ open, onClose, onCreated }: CreateProjectModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) return
    setLoading(true)
    setError('')
    const { error: e2 } = await supabase
      .from('projects')
      .insert({ name: name.trim(), description: description.trim() || null, owner_id: user.id })
    setLoading(false)
    if (e2) { setError(e2.message); return }
    setName('')
    setDescription('')
    onCreated()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="New Album Project">
      <form id="create-project-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-muted mb-1">Project name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Midnight Sessions Vol. 2"
            className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent resize-none"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create project'}</Button>
        </div>
      </form>
    </Modal>
  )
}
