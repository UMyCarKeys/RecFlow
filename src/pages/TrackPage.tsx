import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTrack } from '@/hooks/useTrack'
import { useVersions } from '@/hooks/useVersions'
import { useProject } from '@/hooks/useProject'
import { useRealtimeVersions } from '@/hooks/useRealtimeVersions'
import { VersionCard } from '@/components/track/VersionCard'
import { UploadVersionModal } from '@/components/track/UploadVersionModal'
import { StageProgress } from '@/components/track/StageProgress'
import { IdeaBoard } from '@/components/track/IdeaBoard'
import { CommentThread } from '@/components/comments/CommentThread'
import { TaskList } from '@/components/tasks/TaskList'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import type { Version, TrackStage } from '@/types/database'

export function TrackPage() {
  const { id: projectId = '', trackId = '' } = useParams()
  const { track, loading: trackLoading, updateTrack } = useTrack(trackId)
  const { versions, loading: versionsLoading, addVersion } = useVersions(trackId)
  const { members } = useProject(projectId)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null)

  useRealtimeVersions(trackId, (v: Version) => addVersion(v))

  const selectedVersion = versions.find((v) => v.id === activeVersionId) ?? versions[0] ?? null

  if (trackLoading) return <div id="track-loading" className="flex justify-center py-24"><Spinner /></div>
  if (!track) return <p className="text-muted text-sm p-8">Track not found.</p>

  return (
    <div id="track-page" className="h-full flex flex-col">
      <div id="track-header" className="p-6 border-b border-white/8 flex-shrink-0">
        <div id="track-breadcrumb" className="flex items-center gap-2 text-xs text-muted mb-3">
          <Link to={`/project/${projectId}`} className="hover:text-white transition-colors">← Back to album</Link>
        </div>
        <div id="track-title-row" className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">{track.title}</h1>
          <Button onClick={() => setUploadOpen(true)}>Upload version</Button>
        </div>
        <StageProgress
          stage={track.stage}
          onChange={(s: TrackStage) => updateTrack({ stage: s })}
        />
      </div>

      <div id="track-split" className="flex-1 overflow-hidden flex">
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
          {track.stage === 'idea' && (
            <IdeaBoard
              notes={track.notes}
              links={track.links}
              onNotesChange={(notes) => updateTrack({ notes })}
              onLinksChange={(links) => updateTrack({ links })}
            />
          )}
          {selectedVersion ? (
            <>
              <CommentThread versionId={selectedVersion.id} />
              <TaskList versionId={selectedVersion.id} projectId={projectId} members={members} />
            </>
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
    </div>
  )
}
