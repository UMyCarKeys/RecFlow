import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { PlayerBar } from './PlayerBar'
import { Toast } from '@/components/ui/Toast'
import { DepthBackground } from '@/components/background/DepthBackground'
import { VinylScene } from '@/components/disc/VinylScene'
import { SleeveTransition } from '@/components/disc/SleeveTransition'

export function AppShell() {
  return (
    <div id="app-shell" className="relative h-screen overflow-hidden text-ink">
      <DepthBackground />
      {/* 3D environment is the background on every page; the disc itself only
          shows once you're inside a project (depth > 0). */}
      <VinylScene />

      {/* Soft frost over the 3D environment so it reads as a calm background. */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 6, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      />

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
      <SleeveTransition />
    </div>
  )
}
