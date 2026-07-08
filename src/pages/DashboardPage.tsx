import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProjects } from '@/hooks/useProject'
import { useTrackProgress } from '@/hooks/useTrackProgress'
import { useDepthStore } from '@/store/depthStore'
import { useSleeveTransition } from '@/store/sleeveTransition'
import { ProjectCard } from '@/components/project/ProjectCard'
import { CreateProjectModal } from '@/components/project/CreateProjectModal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

export function DashboardPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { projects, loading, error } = useProjects(refreshKey)
  const { perProject } = useTrackProgress(refreshKey)
  const setDepth = useDepthStore((s) => s.setDepth)
  // Set the moment a card is clicked (ProjectCard starts the sleeve transition):
  // the header UI and all unselected tiles fade out while the clone flies.
  const departing = useSleeveTransition((s) => s.active)

  useEffect(() => setDepth(0), [setDepth])

  // Re-trigger fetch on create by bumping key — simpler than a callback chain
  const handleCreated = () => setRefreshKey((k) => k + 1)

  return (
    <div id="dashboard" className="p-8 max-w-6xl mx-auto">
      <motion.div
        id="dashboard-header"
        className="flex items-end justify-between mb-7"
        animate={{ opacity: departing ? 0 : 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div id="dashboard-title">
          <h1 className="text-3xl font-light tracking-wide text-[#1a1620]">Projects</h1>
          <p className="text-[#6b6275] text-sm mt-1.5 font-light">Your album workspaces</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New project</Button>
      </motion.div>

      {loading ? (
        <div id="dashboard-loading" className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <p id="dashboard-error" className="text-red-400 text-sm">{error}</p>
      ) : projects.length === 0 ? (
        <motion.div
          id="dashboard-empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-8"
        >
          <p className="text-[#6b6275] text-sm mb-5">
            You don't have any projects yet. Explore the demo to see how RecFlow works, or create your first project.
          </p>
          <Link to="/demo" className="block group/demo w-full max-w-[220px]">
            <div className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-spectrum shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
              <div className="absolute inset-0 bg-surface/40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <DemoDisc />
                <span className="text-white font-semibold tracking-wide">Demo</span>
                <span className="text-xs text-white/80 group-hover/demo:translate-x-0.5 transition-transform">Explore →</span>
              </div>
            </div>
            <p className="text-sm text-white font-medium mt-3 px-1">Demo project</p>
            <p className="text-xs text-muted px-1 font-light">Sample tracks, comments &amp; ideas</p>
          </Link>
          <Button className="mt-6" onClick={() => setCreateOpen(true)}>Create your first project</Button>
        </motion.div>
      ) : (
        <div id="dashboard-project-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-7">
          {projects.map((p, i) => {
            const isSelected = departing?.projectId === p.id
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: departing ? 0 : 1, y: 0 }}
                // Departing: the clicked card hides instantly (its flying clone
                // replaces it, so a fade would show a duplicate); the rest fade
                // out smoothly. Otherwise: the staggered entrance.
                transition={
                  departing
                    ? { duration: isSelected ? 0 : 0.35, ease: 'easeOut' }
                    : { delay: i * 0.05 }
                }
              >
                <ProjectCard project={p} progress={perProject[p.id] ?? 0} />
              </motion.div>
            )
          })}
        </div>
      )}

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </div>
  )
}

function DemoDisc() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="20" fill="#120f17" />
      <circle cx="22" cy="22" r="14" fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.8" />
      <circle cx="22" cy="22" r="8" fill="#ff8a6b" fillOpacity="0.9" />
      <circle cx="22" cy="22" r="2" fill="#08060c" />
    </svg>
  )
}
