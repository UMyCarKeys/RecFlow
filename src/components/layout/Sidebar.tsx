import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Avatar } from '@/components/ui/Avatar'

export function Sidebar() {
  const { user, signOut } = useAuth()
  const { profile, updateProfile } = useProfile()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const displayName = profile?.full_name || profile?.username || user?.email

  const startEdit = () => {
    setNameInput(profile?.full_name ?? '')
    setEditingName(true)
  }

  const saveName = async () => {
    await updateProfile({ full_name: nameInput.trim() || null })
    setEditingName(false)
  }

  return (
    <aside id="sidebar" className="w-56 flex-shrink-0 h-screen bg-surface-1 border-r border-white/8 flex flex-col">
      <div id="sidebar-logo" className="p-5 border-b border-white/8">
        <span className="text-white font-bold tracking-tight text-lg">RecFlow</span>
      </div>

      <nav id="sidebar-nav" className="flex-1 p-3 space-y-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-accent/20 text-accent-hover' : 'text-muted hover:text-white hover:bg-surface-3'}`
          }
        >
          <HomeIcon />
          Projects
        </NavLink>
      </nav>

      <div id="sidebar-user" className="p-3 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar name={displayName} size="sm" />
          <div id="sidebar-name" className="flex-1 min-w-0">
            {editingName ? (
              <input
                id="sidebar-name-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') setEditingName(false)
                }}
                autoFocus
                placeholder="Display name"
                className="w-full bg-surface-3 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white placeholder:text-muted focus:outline-none focus:border-accent"
              />
            ) : (
              <button
                id="sidebar-name-display"
                onClick={startEdit}
                title="Edit display name"
                className="group flex items-center gap-1 w-full text-left"
              >
                <span className="text-xs text-muted group-hover:text-white transition-colors truncate">{displayName}</span>
                <PencilIcon className="flex-shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
          <button id="sidebar-signout" onClick={signOut} className="text-muted hover:text-white transition-colors flex-shrink-0" title="Sign out">
            <SignOutIcon />
          </button>
        </div>
      </div>
    </aside>
  )
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 6.5L8 2l6 4.5V14H10v-4H6v4H2V6.5z" />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M11 2l3 3-9 9H2v-3L11 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 3H3v10h3M11 5l3 3-3 3M14 8H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
