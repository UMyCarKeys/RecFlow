import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProject } from '@/hooks/useProject'
import { useTracks } from '@/hooks/useTrack'
import { useDepthStore } from '@/store/depthStore'
import { useSleeveTransition, DISC_ENTRANCE_S } from '@/store/sleeveTransition'
import { MembersModal } from '@/components/project/MembersModal'
import { EditableTitle } from '@/components/ui/EditableTitle'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { uploadCover } from '@/lib/uploadCover'

export function ProjectPage() {
  const { id = '' } = useParams()
  const { project, members, loading: projLoading, addMember, updateMemberRole, removeMember, updateProject } = useProject(id)
  const { tracks, loading: tracksLoading, addTrack } = useTracks(id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [addingTrack, setAddingTrack] = useState(false)
  const [newTrackTitle, setNewTrackTitle] = useState('')
  const [membersOpen, setMembersOpen] = useState(false)
  const [coverBusy, setCoverBusy] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const setDepth = useDepthStore((s) => s.setDepth)
  const setCoverUrl = useDepthStore((s) => s.setCoverUrl)
  const setCoverSeed = useDepthStore((s) => s.setCoverSeed)
  const setTracks = useDepthStore((s) => s.setTracks)
  const setTracksLoading = useDepthStore((s) => s.setTracksLoading)
  const setOnSelectTrack = useDepthStore((s) => s.setOnSelectTrack)
  // Captured once at mount: if we navigated here via the dashboard's sleeve
  // transition, the 3D vinyl plays an arrival tumble (see VinylScene's
  // `entrance` ref) — hold the header/title text hidden until that finishes
  // so it doesn't appear before the record does. A direct visit (refresh,
  // deep link) has no sleeve transition, so the header shows immediately.
  const [cameFromSleeve] = useState(() => !!useSleeveTransition.getState().active)

  useEffect(() => setDepth(1), [setDepth])
  // Publish this project's cover to the vinyl center label; clear on leave.
  useEffect(() => {
    setCoverUrl(project?.cover_url ?? null)
    setCoverSeed(id || null) // seed = project id, so the center matches the dashboard art
    return () => {
      setCoverUrl(null)
      setCoverSeed(null)
    }
  }, [project?.cover_url, id, setCoverUrl, setCoverSeed])
  // Publish active tracks as glowing groove strips on the 3D vinyl.
  useEffect(() => {
    const active = tracks.filter((t) => !t.archived)
    setTracks(active.map((t) => ({ id: t.id, title: t.title, stage: t.stage })))
    return () => setTracks([])
  }, [tracks, setTracks])
  // Publish loading so the 3D empty-state hint doesn't flash while tracks load.
  useEffect(() => {
    setTracksLoading(tracksLoading)
    return () => setTracksLoading(false)
  }, [tracksLoading, setTracksLoading])
  // Drill into a track when its strip is clicked on the vinyl.
  useEffect(() => {
    setOnSelectTrack((tid) => navigate(`/project/${id}/track/${tid}`))
    return () => setOnSelectTrack(null)
  }, [setOnSelectTrack, navigate, id])

  const isOwner = !!user && !!project && project.owner_id === user.id

  const handleRename = (name: string) => {
    if (!project) return
    const history = [...(project.name_history ?? []), { name: project.name, at: new Date().toISOString() }]
    updateProject({ name, name_history: history })
  }

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !project) return
    setCoverBusy(true)
    try {
      const url = await uploadCover(project.id, file)
      await updateProject({ cover_url: url })
    } catch (err) {
      console.error('[cover] upload failed:', err)
    } finally {
      setCoverBusy(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newTrackTitle.trim()) return
    await addTrack(newTrackTitle.trim(), user.id)
    setNewTrackTitle('')
    setAddingTrack(false)
  }

  const activeTracks = tracks.filter((t) => !t.archived)
  const archivedCount = tracks.length - activeTracks.length

  if (projLoading) return <div id="project-loading" className="flex justify-center py-24"><Spinner /></div>
  if (!project) return <p className="text-muted text-sm p-8">Project not found.</p>

  return (
    <div id="project-page" className="h-full flex flex-col">
      <motion.div
        id="project-header"
        className="p-6 flex-shrink-0"
        initial={{ opacity: cameFromSleeve ? 0 : 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: cameFromSleeve ? DISC_ENTRANCE_S : 0, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between">
          <div id="project-title" className="min-w-0">
            <EditableTitle
              value={project.name}
              history={project.name_history ?? []}
              canEdit={isOwner}
              onSave={handleRename}
              className="text-2xl font-light tracking-wide text-[#1a1620]"
            />
            {project.description && <p className="text-[#6b6275] text-sm mt-1 font-light">{project.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
                <Button variant="ghost" size="sm" disabled={coverBusy} onClick={() => coverInputRef.current?.click()}>
                  {coverBusy ? 'Uploading…' : 'Cover'}
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => setMembersOpen(true)}>
              Members{members.length > 0 ? ` · ${members.length}` : ''}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAddingTrack(true)}>+ Add track</Button>
          </div>
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
      </motion.div>

      {/* The record — focal point. The disc itself (including its empty-state
          hint and per-track groove strips) is rendered in 3D by VinylScene,
          which reads tracks/loading state from useDepthStore (published
          above). This area only needs to reserve layout space and show a
          loading spinner while tracks are being fetched. */}
      <div id="project-record" className="flex-1 relative min-h-0">
        {tracksLoading && (
          <div className="flex justify-center py-16"><Spinner /></div>
        )}

        {archivedCount > 0 && (
          <p className="absolute bottom-3 right-4 text-xs text-muted/70">{archivedCount} archived</p>
        )}
      </div>

      {project && (
        <MembersModal
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          ownerId={project.owner_id}
          members={members}
          onAdd={addMember}
          onUpdateRole={updateMemberRole}
          onRemove={removeMember}
        />
      )}
    </div>
  )
}
