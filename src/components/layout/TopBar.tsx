import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Avatar } from '@/components/ui/Avatar'

export function TopBar() {
  const { user, signOut } = useAuth()
  const { profile, updateProfile } = useProfile()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = profile?.full_name || profile?.username || user?.email

  const crumb = location.pathname.includes('/track/')
    ? 'Track'
    : location.pathname.startsWith('/project')
      ? 'Album'
      : 'Projects'

  // Close the menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const startEdit = () => {
    setNameInput(profile?.full_name ?? '')
    setEditing(true)
  }

  const saveName = async () => {
    await updateProfile({ full_name: nameInput.trim() || null })
    setEditing(false)
    setMenuOpen(false)
  }

  return (
    <header id="top-bar" className="group/topbar relative h-14 flex-shrink-0 flex items-center justify-between px-5 z-30">
      {/* Idle tint — stretched across the full page width so it also shows over
          the left rail. pointer-events-none so the rail still expands on hover. */}
      <div className="absolute top-0 bottom-0 -left-[260px] right-0 bg-gradient-to-b from-surface-1/55 via-surface-1/20 to-transparent pointer-events-none" />

      {/* Hover: full glass fill stretched across the whole width, incl. over the left rail */}
      <div className="absolute top-0 bottom-0 -left-[260px] right-0 opacity-0 group-hover/topbar:opacity-100 transition-opacity duration-300 glass border-b border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] pointer-events-none" />

      {/* Breadcrumb / context */}
      <div className="relative flex items-center gap-2.5 text-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-spectrum-warm" />
        <span className="text-ink/90 font-medium">{crumb}</span>
      </div>

      {/* User chip */}
      <div ref={menuRef} className="relative">
        <button
          id="top-bar-user"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-full pl-1 pr-3 py-1 hover:bg-white/[0.06] transition-colors"
        >
          <Avatar name={displayName} size="sm" />
          <span className="text-sm text-ink/80 max-w-0 group-hover/topbar:max-w-[160px] overflow-hidden whitespace-nowrap transition-[max-width] duration-300">
            {displayName}
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl glass-strong border border-white/[0.08] shadow-xl p-2 z-50">
            {editing ? (
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') setEditing(false)
                }}
                autoFocus
                placeholder="Display name"
                className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
              />
            ) : (
              <button
                onClick={startEdit}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-ink/80 hover:bg-white/[0.06] transition-colors"
              >
                Edit display name
              </button>
            )}
            <button
              onClick={signOut}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-accent-rose hover:bg-white/[0.06] transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
