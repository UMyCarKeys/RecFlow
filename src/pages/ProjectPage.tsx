import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProject } from '@/hooks/useProject'
import { useTracks } from '@/hooks/useTrack'
import { useDepthStore } from '@/store/depthStore'
import { VinylRecord } from '@/components/disc/VinylRecord'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import type { Track } from '@/types/database'

export function ProjectPage() {
  const { id = '' } = useParams()
  const { project, loading: projLoading } = useProject(id)
  const { tracks, loading: tracksLoading, addTrack } = useTracks(id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [addingTrack, setAddingTrack] = useState(false)
  const [newTrackTitle, setNewTrackTitle] = useState('')
  const [selecting, setSelecting] = useState<Track | null>(null)
  const setDepth = useDepthStore((s) => s.setDepth)

  useEffect(() => setDepth(1), [setDepth])

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newTrackTitle.trim()) return
    await addTrack(newTrackTitle.trim(), user.id)
    setNewTrackTitle('')
    setAddingTrack(false)
  }

  const activeTracks = tracks.filter((t) => !t.archived)
  const archivedCount = tracks.length - activeTracks.length

  // Dive into a track: zoom the record up, then navigate
  const handleSelect = (track: Track) => {
    setSelecting(track)
    setTimeout(() => navigate(`/project/${id}/track/${track.id}`), 520)
  }

  if (projLoading) return <div id="project-loading" className="flex justify-center py-24"><Spinner /></div>
  if (!project) return <p className="text-muted text-sm p-8">Project not found.</p>

  return (
    <div id="project-page" className="h-full flex flex-col">
      <div id="project-header" className="p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div id="project-title">
            <h1 className="text-2xl font-light tracking-wide text-white">{project.name}</h1>
            {project.description && <p className="text-muted text-sm mt-1 font-light">{project.description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAddingTrack(true)}>+ Add track</Button>
        </div>

        {addingTrack && (
          <form id="project-add-track-form" onSubmit={handleAddTrack} className="flex gap-2 mt-4 max-w-md">
            <input
              value={newTrackTitle}
              onChange={(e) => setNewTrackTitle(e.target.value)}
              placeholder="Track title"
              autoFocus
              className="flex-1 bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
            />
            <Button type="submit" size="sm">Add</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAddingTrack(false)}>Cancel</Button>
          </form>
        )}
      </div>

      {/* The record — focal point */}
      <div id="project-record" className="flex-1 relative min-h-0">
        {tracksLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : activeTracks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted text-sm">No active tracks yet. Add one above to start the record.</p>
          </motion.div>
        ) : (
          <motion.div
            className="w-full h-full p-6"
            initial={{ scale: 0.72, opacity: 0 }}
            animate={selecting ? { scale: 2.6, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={{ duration: selecting ? 0.55 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <VinylRecord tracks={activeTracks} projectName={project.name} onSelect={handleSelect} />
          </motion.div>
        )}

        {archivedCount > 0 && (
          <p className="absolute bottom-3 right-4 text-xs text-muted/70">{archivedCount} archived</p>
        )}
      </div>
    </div>
  )
}
