import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useChromeStore } from '@/store/chromeStore'

export function Sidebar() {
  const { railHover, barHover, setRailHover } = useChromeStore()
  const chromeHover = railHover || barHover

  return (
    <aside
      id="sidebar"
      onMouseEnter={() => setRailHover(true)}
      onMouseLeave={() => setRailHover(false)}
      className="group/sidebar relative z-40 h-full w-[68px] hover:w-56 transition-[width] duration-300 ease-out flex-shrink-0"
    >
      {/* Idle: fully transparent. On hover: a light glass panel with a crisp edge */}
      <div className="absolute inset-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 glass-light border-r border-line/[0.06] shadow-[inset_-1px_0_0_rgba(0,0,0,0.04)]" />

      <div className="relative h-full flex flex-col">
        {/* Logo */}
        <div id="sidebar-logo" className="h-14 flex items-center flex-shrink-0">
          <div className="w-[68px] flex justify-center flex-shrink-0">
            <div
              className={`w-7 h-7 rounded-full bg-spectrum transition-all duration-300 ${
                chromeHover
                  ? 'scale-110 brightness-125 shadow-[0_0_32px_rgba(255,138,107,0.9)]'
                  : 'shadow-[0_0_18px_rgba(255,138,107,0.4)]'
              }`}
            />
          </div>
          <span className="font-semibold tracking-tight text-lg whitespace-nowrap text-ink opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
            RecFlow
          </span>
        </div>

        {/* Nav */}
        <nav id="sidebar-nav" className="flex-1 py-3 space-y-1">
          <RailLink to="/" label="Projects" icon={<HomeIcon />} />
        </nav>

        {/* Pinned to the bottom of the rail: personal checklist */}
        <nav id="sidebar-bottom" className="py-3">
          <RailLink to="/tasks" label="Tasks" icon={<TasksIcon />} />
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
            ? 'border-accent text-ink'
            : 'border-transparent text-muted hover:text-ink'
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

// Minimal checklist: a check with two list lines, matching the rail's stroke style.
function TasksIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4.5L4 6l2.5-3" />
      <path d="M9 5h4.5" />
      <path d="M2.5 10.5L4 12l2.5-3" />
      <path d="M9 11h4.5" />
    </svg>
  )
}
