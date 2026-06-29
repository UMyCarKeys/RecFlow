import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTrack } from '@/hooks/useTrack'
import { useDepthStore } from '@/store/depthStore'
import { useVersions } from '@/hooks/useVersions'
import { useProject } from '@/hooks/useProject'
import { useRealtimeVersions } from '@/hooks/useRealtimeVersions'
import { VersionCard } from '@/components/track/VersionCard'
import { UploadVersionModal } from '@/components/track/UploadVersionModal'
import { StageProgress } from '@/components/track/StageProgress'
import { IdeaBoard } from '@/components/track/IdeaBoard'
import { GrooveField } from '@/components/disc/GrooveField'
import { CommentThread } from '@/components/comments/CommentThread'
import { CompareLines } from '@/components/track/CompareLines'
import { GifPicker } from '@/components/track/GifPicker'
import { GifPostit } from '@/components/track/GifPostit'
import { EditableTitle } from '@/components/ui/EditableTitle'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { trackHue } from '@/lib/trackColor'
import { groupVariants, variantHue, COMPARE_STAGES, POST_MIX_STAGES } from '@/lib/variants'
import type { Version, TrackStage } from '@/types/database'

export function TrackPage() {
  const { id: projectId = '', trackId = '' } = useParams()
  const { track, loading: trackLoading, updateTrack } = useTrack(trackId)
  const { versions, loading: versionsLoading, addVersion, commitToVariant } = useVersions(trackId)
  const { members } = useProject(projectId)
  const { user } = useAuth()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [commitTarget, setCommitTarget] = useState<TrackStage | null>(null)
  const [keepVariant, setKeepVariant] = useState<string | null>(null)
  const [gifPickerOpen, setGifPickerOpen] = useState(false)
  const setDepth = useDepthStore((s) => s.setDepth)

  useEffect(() => setDepth(2), [setDepth])

  const myRole = members.find((m) => m.user_id === user?.id)?.role
  const canEdit = myRole === 'owner' || myRole === 'contributor'

  const handleRename = (title: string) => {
    if (!track) return
    const history = [...(track.title_history ?? []), { name: track.title, at: new Date().toISOString() }]
    updateTrack({ title, title_history: history })
  }

  useRealtimeVersions(trackId, (v: Version) => addVersion(v))

  const selectedVersion = versions.find((v) => v.id === activeVersionId) ?? versions[0] ?? null

  if (trackLoading) return <div id="track-loading" className="flex justify-center py-24"><Spinner /></div>
  if (!track) return <p className="text-muted text-sm p-8">Track not found.</p>

  const lines = groupVariants(versions)
  const showCompare = (COMPARE_STAGES as readonly string[]).includes(track.stage) && versions.length > 0

  // Advancing past Mix with multiple lines forces committing to one direction
  const handleStageChange = (s: TrackStage) => {
    if ((POST_MIX_STAGES as readonly string[]).includes(s) && lines.length > 1) {
      setKeepVariant(lines[0].variant)
      setCommitTarget(s)
      return
    }
    updateTrack({ stage: s })
  }

  const handleCommit = async () => {
    if (commitTarget === null) return
    await commitToVariant(keepVariant)
    await updateTrack({ stage: commitTarget })
    setActiveVersionId(null)
    setCommitTarget(null)
  }

  return (
    <motion.div
      id="track-page"
      className="relative h-full flex flex-col"
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Deep groove field in the track's color, hovering behind everything */}
      <GrooveField hue={trackHue(trackId)} glow={!!(track.notes || track.links.length)} />

      <div id="track-header" className="relative z-10 p-6 border-b border-black/[0.06] flex-shrink-0">
        <div id="track-breadcrumb" className="flex items-center gap-2 text-xs text-[#6b6275] mb-3">
          <Link to={`/project/${projectId}`} className="hover:text-[#1a1620] transition-colors">← Back to album</Link>
        </div>
        <div id="track-title-row" className="flex items-center justify-between gap-3 mb-4">
          <EditableTitle
            value={track.title}
            history={track.title_history ?? []}
            canEdit={canEdit}
            onSave={handleRename}
            className="text-2xl font-light tracking-wide text-[#1a1620]"
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => (track.archived ? updateTrack({ archived: false }) : setArchiveConfirm(true))}>
              {track.archived ? 'Restore' : 'Archive'}
            </Button>
            <Button onClick={() => setUploadOpen(true)}>Upload version</Button>
          </div>
        </div>

        {track.archived && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-surface-3/70 border border-white/10 text-xs text-muted">
            This track is archived — it won't be used for this project and is excluded from the album's progress. Use
            <span className="text-white"> Restore</span> to bring it back.
          </div>
        )}

        <StageProgress stage={track.stage} onChange={handleStageChange} />
      </div>

      <div id="track-split" className="relative z-10 flex-1 overflow-hidden flex bg-surface-1/55 backdrop-blur-md">
        <div id="track-versions-panel" className="w-80 flex-shrink-0 border-r border-white/8 overflow-y-auto p-4 space-y-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Versions</h2>
          {versionsLoading ? (
            <div id="track-versions-loading" className="flex justify-center py-8"><Spinner /></div>
          ) : versions.length === 0 ? (
            <p id="track-versions-empty" className="text-xs text-muted">No versions yet. Upload one above.</p>
          ) : (
            versions.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setActiveVersionId(v.id)}
                className={`cursor-pointer ${activeVersionId === v.id ? 'ring-1 ring-accent/40 rounded-xl' : ''}`}
              >
                <VersionCard version={v} trackTitle={track.title} isLatest={i === 0} />
              </motion.div>
            ))
          )}
        </div>

        <div id="track-right-panel" className="flex-1 overflow-y-auto p-6 space-y-8">
          {(track.gif_url || canEdit) && (
            <div className="flex justify-end">
              {track.gif_url ? (
                <GifPostit
                  url={track.gif_url}
                  canEdit={canEdit}
                  onChange={() => setGifPickerOpen(true)}
                  onRemove={() => updateTrack({ gif_url: null })}
                />
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setGifPickerOpen(true)}>+ Add GIF</Button>
              )}
            </div>
          )}
          {track.stage === 'idea' && (
            <IdeaBoard ideas={track.links} onChange={(ideas) => updateTrack({ links: ideas })} />
          )}
          {showCompare && (
            <CompareLines
              versions={versions}
              trackTitle={track.title}
              activeVersionId={selectedVersion?.id ?? null}
              onSelectVersion={setActiveVersionId}
            />
          )}
          {selectedVersion ? (
            <CommentThread versionId={selectedVersion.id} projectId={projectId} members={members} />
          ) : (
            <p id="track-no-version-hint" className="text-muted text-sm">Select a version or upload one to see comments and tasks.</p>
          )}
        </div>
      </div>

      <UploadVersionModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        trackId={trackId}
        onUploaded={() => setUploadOpen(false)}
      />

      <GifPicker open={gifPickerOpen} onClose={() => setGifPickerOpen(false)} onPick={(url) => updateTrack({ gif_url: url })} />

      <ConfirmDialog
        open={archiveConfirm}
        title="Archive this track?"
        message="It will be hidden from the record and removed from the album's completion calculations. You can restore it anytime."
        confirmLabel="Archive"
        onConfirm={() => updateTrack({ archived: true })}
        onClose={() => setArchiveConfirm(false)}
      />

      <Modal open={commitTarget !== null} onClose={() => setCommitTarget(null)} title="Commit to one direction">
        <p className="text-sm text-muted leading-relaxed">
          Moving past Mix means choosing the line to carry forward. The other lines will be set aside — you won't lose
          them, but they leave the active record so the project keeps moving.
        </p>
        <div className="mt-4 space-y-2">
          {lines.map((line) => {
            const active = (keepVariant ?? null) === (line.variant ?? null)
            return (
              <button
                key={line.label}
                onClick={() => setKeepVariant(line.variant)}
                className={`w-full flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                  active ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: variantHue(line.variant) }} />
                <span className="text-sm text-white flex-1 text-left truncate">{line.label}</span>
                <span className="text-xs text-muted">v{line.latest.version_number}</span>
              </button>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setCommitTarget(null)}>Cancel</Button>
          <Button onClick={handleCommit}>Keep this line &amp; continue</Button>
        </div>
      </Modal>
    </motion.div>
  )
}
