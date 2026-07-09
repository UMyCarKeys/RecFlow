import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { PlayerBar } from './PlayerBar'
import { Toast } from '@/components/ui/Toast'
import { ThemeFx } from '@/components/ui/ThemeSwitcher'
import { VinylScene } from '@/components/disc/VinylScene'
import { SleeveTransition } from '@/components/disc/SleeveTransition'

export function AppShell() {
  return (
    <div id="app-shell" className="relative h-dvh overflow-hidden text-ink">
      {/* VinylScene's own Backdrop plane is the sole background on every page
          (it fully covers the viewport whenever showBackdrop is on); the disc
          itself only shows once you're inside a project (depth > 0). There is
          no separate 2D background layer — the 3D environment is the only
          source of background rendering, on desktop and mobile alike. */}
      <VinylScene />

      <div className="relative z-10 flex h-full">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main id="main-content" className="flex-1 overflow-y-auto overscroll-contain pb-16">
            <Outlet />
          </main>
        </div>
      </div>

      <PlayerBar />
      <Toast />
      <SleeveTransition />
      {/* lights-flicker overlay for theme switches */}
      <ThemeFx />
    </div>
  )
}
