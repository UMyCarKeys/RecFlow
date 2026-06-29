import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useProjects } from '@/hooks/useProject'
import { useDepthStore } from '@/store/depthStore'
import { ProjectCard } from '@/components/project/ProjectCard'
import { CreateProjectModal } from '@/components/project/CreateProjectModal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

export function DashboardPage() {
  const { projects, loading, error } = useProjects()
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const setDepth = useDepthStore((s) => s.setDepth)

  useEffect(() => setDepth(0), [setDepth])

  // Re-trigger fetch on create by bumping key — simpler than a callback chain
  const handleCreated = () => setRefreshKey((k) => k + 1)

  return (
    <div id="dashboard" className="p-8">
      <div id="dashboard-header" className="flex items-center justify-between mb-8">
        <div id="dashboard-title">
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-muted text-sm mt-1">Your album workspaces</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New project</Button>
      </div>

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
        <div id="dashboard-project-grid" key={refreshKey} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {projects.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <ProjectCard project={p} />
            </motion.div>
          ))}
        </div>
      )}

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </div>
  )
}
