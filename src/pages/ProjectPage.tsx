import { lazy, Suspense, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProject } from '@/hooks/useProject'
import { useTracks } from '@/hooks/useTrack'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Track, Version } from '@/types/database'

const DiscScene = lazy(() => import('@/components/disc/DiscScene').then((m) => ({ default: m.DiscScene })))

export function ProjectPage() {
  const { id = '' } = useParams()
  const { project, loading: projLoading } = useProject(id)
  const { tracks, loading: tracksLoading, addTrack } = useTracks(id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [addingTrack, setAddingTrack] = useState(false)
  const [newTrackTitle, setNewTrackTitle] = useState('')

  // Gather latest version per track
  const latestVersions = useLatestVersionsForTracks(tracks)

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newTrackTitle.trim()) return
    await addTrack(newTrackTitle.trim(), user.id)
    setNewTrackTitle('')
    setAddingTrack(false)
  }

  if (projLoading) return <div className="flex justify-center py-24"><Spinner /></div>
  if (!project) return <p className="text-muted text-sm p-8">Project not found.</p>

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
            {project.description && <p className="text-muted text-sm mt-1">{project.description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAddingTrack(true)}>+ Add track</Button>
        </div>

        {addingTrack && (
          <form onSubmit={handleAddTrack} className="flex gap-2 mt-4">
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

      {/* 3D disc grid */}
      <div className="flex-1 relative">
        {tracksLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : tracks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted text-sm">No tracks yet. Add one above.</p>
          </motion.div>
        ) : (
          <Suspense fallback={<div className="flex justify-center py-16"><Spinner /></div>}>
            <DiscScene
              tracks={tracks}
              latestVersions={latestVersions}
              onDiscClick={(_version: Version, track: Track) => navigate(`/project/${id}/track/${track.id}`)}
            />
          </Suspense>
        )}

        {/* Track labels below disc grid */}
        {tracks.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 grid grid-cols-4 gap-4 pointer-events-none">
            {tracks.map((track) => (
              <div key={track.id} className="text-center">
                <p className="text-xs text-muted truncate">{track.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function useLatestVersionsForTracks(tracks: Track[]): Record<string, Version> {
  const [versions, setVersions] = useState<Record<string, Version>>({})

  tracks.forEach((track) => {
    if (versions[track.id]) return
    supabase
      .from('versions')
      .select('*')
      .eq('track_id', track.id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setVersions((prev) => ({ ...prev, [track.id]: data as Version }))
      })
  })

  return versions
}
