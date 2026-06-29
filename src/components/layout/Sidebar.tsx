import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

export function Sidebar() {
  return (
    <aside
      id="sidebar"
      className="group/sidebar relative z-20 h-full w-[68px] hover:w-56 transition-[width] duration-300 ease-out flex-shrink-0"
    >
      {/* Gradient glass surface */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-white/[0.02] to-transparent backdrop-blur-xl border-r border-white/[0.06]" />

      <div className="relative h-full flex flex-col">
        {/* Logo */}
        <div id="sidebar-logo" className="h-14 flex items-center flex-shrink-0">
          <div className="w-[68px] flex justify-center flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-spectrum shadow-[0_0_20px_rgba(255,138,107,0.45)]" />
          </div>
          <span className="font-semibold tracking-tight text-lg whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
            RecFlow
          </span>
        </div>

        {/* Nav */}
        <nav id="sidebar-nav" className="flex-1 py-3 space-y-1">
          <RailLink to="/" label="Projects" icon={<HomeIcon />} />
        </nav>
      </div>
    </aside>
  )
}

function RailLink({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `relative flex items-center h-11 border-l-2 transition-colors ${
          isActive
            ? 'border-accent text-white'
            : 'border-transparent text-muted hover:text-white'
        }`
      }
    >
      <span className="w-[66px] flex justify-center flex-shrink-0">{icon}</span>
      <span className="text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
        {label}
      </span>
    </NavLink>
  )
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 6.5L8 2l6 4.5V14H10v-4H6v4H2V6.5z" />
    </svg>
  )
}
