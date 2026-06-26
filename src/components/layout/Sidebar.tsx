import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'

export function Sidebar() {
  const { user, signOut } = useAuth()

  return (
    <aside className="w-56 flex-shrink-0 h-screen bg-surface-1 border-r border-white/8 flex flex-col">
      <div className="p-5 border-b border-white/8">
        <span className="text-white font-bold tracking-tight text-lg">RecFlow</span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
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

      <div className="p-3 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar name={user?.email} size="sm" />
          <span className="text-xs text-muted truncate flex-1">{user?.email}</span>
          <button onClick={signOut} className="text-muted hover:text-white transition-colors" title="Sign out">
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

function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 3H3v10h3M11 5l3 3-3 3M14 8H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
