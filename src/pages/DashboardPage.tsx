import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useProjects } from '@/hooks/useProject'
import { useTrackProgress } from '@/hooks/useTrackProgress'
import { useDepthStore } from '@/store/depthStore'
import { ProjectCard } from '@/components/project/ProjectCard'
import { CreateProjectModal } from '@/components/project/CreateProjectModal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

export function DashboardPage() {
  const { projects, loading, error } = useProjects()
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { perProject, overall } = useTrackProgress(refreshKey)
  const setDepth = useDepthStore((s) => s.setDepth)

  useEffect(() => setDepth(0), [setDepth])

  // Re-trigger fetch on create by bumping key — simpler than a callback chain
  const handleCreated = () => setRefreshKey((k) => k + 1)

  const overallPct = Math.round(overall * 100)

  return (
    <div id="dashboard" className="p-8 max-w-6xl mx-auto">
      <div id="dashboard-header" className="flex items-end justify-between mb-7">
        <div id="dashboard-title">
          <h1 className="text-3xl font-light tracking-wide text-white">Projects</h1>
          <p className="text-muted text-sm mt-1.5 font-light">Your album workspaces</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New project</Button>
      </div>

      {/* Overall progress — matched to one cover-tile width */}
      {projects.length > 0 && (
        <div className="mb-9 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5">
          <div id="dashboard-overall-progress" className="col-span-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-light tracking-wide text-muted uppercase">Overall</span>
              <span className="text-xs font-medium text-white/90">{overallPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-spectrum"
                initial={{ width: 0 }}
                animate={{ width: `${overallPct}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div id="dashboard-loading" className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <p id="dashboard-error" className="text-red-400 text-sm">{error}</p>
      ) : projects.length === 0 ? (
        <motion.div
          id="dashboard-empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24"
        >
          <p className="text-muted text-sm">No projects yet.</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>Create your first project</Button>
        </motion.div>
      ) : (
        <div id="dashboard-project-grid" key={refreshKey} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-7">
          {projects.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <ProjectCard project={p} progress={perProject[p.id] ?? 0} />
            </motion.div>
          ))}
        </div>
      )}

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </div>
  )
}
