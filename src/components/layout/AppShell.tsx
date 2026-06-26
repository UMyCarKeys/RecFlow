import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { PlayerBar } from './PlayerBar'
import { Toast } from '@/components/ui/Toast'

export function AppShell() {
  return (
    <div className="flex h-screen bg-surface text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <PlayerBar />
      <Toast />
    </div>
  )
}
