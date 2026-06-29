import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { displayName } from '@/lib/displayName'
import type { MemberRole, ProjectMember, Profile } from '@/types/database'

type ProfileLite = Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>

interface MembersModalProps {
  open: boolean
  onClose: () => void
  ownerId: string
  members: ProjectMember[]
  onAdd: (userId: string, role: MemberRole) => Promise<{ error: unknown }>
  onUpdateRole: (memberId: string, role: MemberRole) => Promise<{ error: unknown }>
  onRemove: (memberId: string) => Promise<{ error: unknown }>
}

export function MembersModal({ open, onClose, ownerId, members, onAdd, onUpdateRole, onRemove }: MembersModalProps) {
  const { user } = useAuth()
  const isOwner = user?.id === ownerId
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProfileLite[]>([])
  const [addRole, setAddRole] = useState<MemberRole>('contributor')
  const [removing, setRemoving] = useState<ProjectMember | null>(null)
  const [busy, setBusy] = useState(false)

  const runSearch = async (q: string) => {
    setQuery(q)
    if (!q.trim()) {
      setResults([])
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .ilike('username', `%${q.trim()}%`)
      .limit(6)
    setResults(((data as ProfileLite[]) ?? []).filter((p) => !members.some((m) => m.user_id === p.id)))
  }

  const add = async (userId: string) => {
    setBusy(true)
    await onAdd(userId, addRole)
    setBusy(false)
    setQuery('')
    setResults([])
  }

  return (
    <Modal open={open} onClose={onClose} title="Members">
      <div className="space-y-4">
        {/* Current members */}
        <div className="space-y-2">
          {members.map((m) => {
            const memberIsOwner = m.user_id === ownerId
            return (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar src={m.profiles?.avatar_url} name={displayName(m.profiles)} size="sm" />
                <span className="text-sm text-white flex-1 truncate">{displayName(m.profiles)}</span>
                {isOwner && !memberIsOwner ? (
                  <select
                    value={m.role}
                    onChange={(e) => onUpdateRole(m.id, e.target.value as MemberRole)}
                    className="bg-surface-3 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-accent"
                  >
                    <option value="contributor">Contributor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span className="text-xs text-muted capitalize">{m.role}</span>
                )}
                {isOwner && !memberIsOwner && (
                  <button onClick={() => setRemoving(m)} className="text-muted hover:text-red-400 transition-colors" title="Remove">
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Add member (owner only) */}
        {isOwner && (
          <div className="pt-3 border-t border-white/8 space-y-2">
            <label className="block text-xs text-muted">Add a member by username</label>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => runSearch(e.target.value)}
                placeholder="Search username…"
                className="flex-1 bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as MemberRole)}
                className="bg-surface-3 border border-white/10 rounded-lg px-2 text-sm text-white focus:outline-none focus:border-accent"
              >
                <option value="contributor">Contributor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            {results.length > 0 && (
              <div className="space-y-1">
                {results.map((p) => (
                  <button
                    key={p.id}
                    disabled={busy}
                    onClick={() => add(p.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-left disabled:opacity-50"
                  >
                    <Avatar src={p.avatar_url} name={displayName(p)} size="sm" />
                    <span className="text-sm text-white flex-1 truncate">{displayName(p)}</span>
                    <span className="text-xs text-accent">Add</span>
                  </button>
                ))}
              </div>
            )}
            {query.trim() && results.length === 0 && <p className="text-xs text-muted">No matching users.</p>}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={removing !== null}
        title="Remove member?"
        message={`Remove ${displayName(removing?.profiles)} from this project? They'll lose access to it.`}
        confirmLabel="Remove"
        danger
        onConfirm={() => removing && onRemove(removing.id)}
        onClose={() => setRemoving(null)}
      />
    </Modal>
  )
}
