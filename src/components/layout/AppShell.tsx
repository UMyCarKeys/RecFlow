import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { PlayerBar } from './PlayerBar'
import { Toast } from '@/components/ui/Toast'
import { DepthBackground } from '@/components/background/DepthBackground'

export function AppShell() {
  return (
    <div id="app-shell" className="relative h-screen overflow-hidden text-ink">
      <DepthBackground />

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
