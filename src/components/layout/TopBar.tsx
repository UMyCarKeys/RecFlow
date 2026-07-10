import { useState, useEffect, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useMyTasks } from '@/hooks/useMyTasks'
import { useChromeStore } from '@/store/chromeStore'
import { Avatar } from '@/components/ui/Avatar'
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher'

export function TopBar() {
  const { user, signOut } = useAuth()
  const { profile, updateProfile } = useProfile()
  const { openTasks, memberships, count: taskCount } = useMyTasks(user?.id)
  const setBarHover = useChromeStore((s) => s.setBarHover)
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  // Membership notices don't have a done-state like tasks, so "seen" is when
  // the bell was last opened (persisted) — the badge counts only newer joins.
  const [bellSeenAt, setBellSeenAt] = useState(() => Number(localStorage.getItem('recflow-bell-seen') ?? 0))
  const unseenJoins = memberships.filter((m) => new Date(m.joined_at).getTime() > bellSeenAt)
  const count = taskCount + unseenJoins.length
  const openBell = () => {
    setBellOpen((v) => {
      if (!v) {
        const now = Date.now()
        setBellSeenAt(now)
        localStorage.setItem('recflow-bell-seen', String(now))
      }
      return !v
    })
  }
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  const displayName = profile?.full_name || profile?.username || user?.email

  // No crumb on the dashboard — the page's own "Projects" title already says
  // where you are; the label only adds context once you've drilled in.
  const crumb = location.pathname.includes('/track/')
    ? 'Track'
    : location.pathname.startsWith('/project')
      ? 'Album'
      : null

  // Close the menus when clicking outside
  useEffect(() => {
    if (!menuOpen && !bellOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setEditing(false)
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen, bellOpen])

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
    <header
      id="top-bar"
      onMouseEnter={() => setBarHover(true)}
      onMouseLeave={() => setBarHover(false)}
      className="group/topbar relative h-14 flex-shrink-0 flex items-center justify-between px-5 z-30"
    >
      {/* Idle: fully transparent. On hover: full light-glass fill across the whole width, incl. over the left rail */}
      <div className="absolute top-0 bottom-0 -left-[260px] right-0 opacity-0 group-hover/topbar:opacity-100 transition-opacity duration-300 glass-light border-b border-line/[0.06] shadow-[inset_0_1px_0_rgba(0,0,0,0.04)] pointer-events-none" />

      {/* Breadcrumb / context — only when drilled into an album/track */}
      <div className="relative flex items-center gap-2.5 text-sm">
        {crumb && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-spectrum-warm" />
            <span className="text-ink font-medium">{crumb}</span>
          </>
        )}
      </div>

      {/* Right cluster: mood + notifications + user */}
      <div className="relative flex items-center gap-1">
        <ThemeSwitcher />
        {/* Notification bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={openBell}
            className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-line/[0.05] transition-colors"
            title="Tasks assigned to you"
          >
            <BellIcon active={count > 0} />
            {count > 0 && (
              <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-accent text-[9px] font-bold text-white flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
          {bellOpen && (
            <div data-ui-overlay className="absolute right-0 mt-2 w-72 rounded-xl glass-light border border-line/[0.08] shadow-xl p-2 z-50">
              {memberships.length > 0 && (
                <>
                  <p className="px-2 py-1 text-xs font-semibold text-muted uppercase tracking-wide">New projects</p>
                  {memberships.map((m) => (
                    <Link
                      key={m.id}
                      to={`/project/${m.project_id}`}
                      onClick={() => setBellOpen(false)}
                      className="block px-2 py-2 rounded-lg text-sm text-ink hover:bg-line/[0.05] transition-colors truncate"
                    >
                      Added to <span className="font-medium">{m.project_name}</span>
                    </Link>
                  ))}
                </>
              )}
              <p className="px-2 py-1 text-xs font-semibold text-muted uppercase tracking-wide">Assigned to you</p>
              {openTasks.length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted">Nothing outstanding.</p>
              ) : (
                openTasks.slice(0, 6).map((t) => (
                  <Link
                    key={t.id}
                    to={`/project/${t.project_id}/track/${t.track_id}`}
                    onClick={() => setBellOpen(false)}
                    className="block px-2 py-2 rounded-lg text-sm text-ink hover:bg-line/[0.05] transition-colors truncate"
                  >
                    {t.title}
                  </Link>
                ))
              )}
              <button
                onClick={() => {
                  setBellOpen(false)
                  useChromeStore.getState().setTasksOpen(true)
                }}
                className="block w-full text-left px-2 py-2 mt-1 rounded-lg text-xs text-muted hover:text-ink hover:bg-line/[0.05] transition-colors border-t border-line/[0.06]"
              >
                View all tasks →
              </button>
            </div>
          )}
        </div>

        {/* User chip */}
        <div ref={menuRef} className="relative">
        <button
          id="top-bar-user"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-full pl-1 pr-3 py-1 hover:bg-line/[0.05] transition-colors"
        >
          <Avatar name={displayName} size="sm" />
          <span className="text-sm text-ink max-w-0 group-hover/topbar:max-w-[160px] overflow-hidden whitespace-nowrap transition-[max-width] duration-300">
            {displayName}
          </span>
        </button>

        {menuOpen && (
          <div data-ui-overlay className="absolute right-0 mt-2 w-56 rounded-xl glass-light border border-line/[0.08] shadow-xl p-2 z-50">
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
                className="w-full field-glass border border-line/10 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-accent"
              />
            ) : (
              <button
                onClick={startEdit}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-ink hover:bg-line/[0.05] transition-colors"
              >
                Edit display name
              </button>
            )}
            <button
              onClick={signOut}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-accent-rose hover:bg-line/[0.05] transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  )
}

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 16 16"
      fill="none"
      stroke={active ? '#ff8a6b' : 'currentColor'}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? '' : 'text-muted'}
    >
      <path d="M8 2a4 4 0 0 0-4 4c0 3-1.2 4-1.2 4h10.4S12 9 12 6a4 4 0 0 0-4-4z" />
      <path d="M6.8 13a1.4 1.4 0 0 0 2.4 0" />
    </svg>
  )
}
