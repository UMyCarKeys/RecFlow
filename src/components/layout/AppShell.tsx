import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { PlayerBar } from './PlayerBar'
import { Toast } from '@/components/ui/Toast'
import { DepthBackground } from '@/components/background/DepthBackground'
import { VinylScene } from '@/components/disc/VinylScene'

export function AppShell() {
  const { pathname } = useLocation()
  // Frosted vinyl backdrop only on the pages that show the record. It sits at
  // z-5 (below the z-10 DOM UI), so the SVG VinylRecord layers over it.
  const showVinyl = pathname === '/demo' || /^\/project\/[^/]+$/.test(pathname)
  return (
    <div id="app-shell" className="relative h-screen overflow-hidden text-ink">
      <DepthBackground />
      {showVinyl && <VinylScene />}

      <div className="relative z-10 flex h-full">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main id="main-content" className="flex-1 overflow-y-auto pb-16">
            <Outlet />
          </main>
        </div>
      </div>

      <PlayerBar />
      <Toast />
    </div>
  )
}
