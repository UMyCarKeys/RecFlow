import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDepthStore } from '@/store/depthStore'
import { VinylRecord } from '@/components/disc/VinylRecord'
import { StageProgress } from '@/components/track/StageProgress'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Tag } from '@/components/ui/Tag'
import { formatDuration, timeAgo } from '@/lib/utils'
import { variantHue } from '@/lib/variants'
import { DEMO_TRACKS, DEMO_RECORD_TRACKS, DEMO_PROJECT_NAME, type DemoTrack } from '@/lib/demoData'
import type { Track } from '@/types/database'

export function DemoPage() {
  const navigate = useNavigate()
  const setDepth = useDepthStore((s) => s.setDepth)
  const [selected, setSelected] = useState<DemoTrack | null>(null)

  useEffect(() => setDepth(1), [setDepth])

  const openTrack = (track: Track) => {
    const demo = DEMO_TRACKS.find((t) => t.id === track.id) ?? null
    setSelected(demo)
  }

  return (
    <div id="demo-page" className="h-full flex flex-col">
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-light tracking-wide text-[#1a1620]">{DEMO_PROJECT_NAME}</h1>
            <p className="text-[#6b6275] text-sm mt-1 font-light">A sample project — explore how RecFlow works.</p>
          </div>
          <Button onClick={() => navigate('/')}>Create your project</Button>
        </div>

        <div className="mt-4 px-3 py-2 rounded-lg bg-accent/10 border border-accent/25 text-xs text-accent-hover">
          You're exploring a demo. The tracks, comments and ideas here are placeholders. Create a project — or get added
          to one — and this is replaced by your real work.
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        <motion.div
          className="w-full h-full p-6"
          initial={{ scale: 0.72, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <VinylRecord tracks={DEMO_RECORD_TRACKS} projectName={DEMO_PROJECT_NAME} onSelect={openTrack} />
        </motion.div>
      </div>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.title ?? ''}>
        {selected && <DemoTrackDetail track={selected} />}
      </Modal>
    </div>
  )
}

function DemoTrackDetail({ track }: { track: DemoTrack }) {
  return (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto no-scrollbar">
      <StageProgress stage={track.stage} />

      {track.stage === 'idea' && track.ideas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Idea Board</h3>
          {track.ideas.map((idea, i) => (
            <div key={i} className="p-3 rounded-lg bg-surface-3/70 border border-white/8">
              <p className="text-sm text-white/90 leading-relaxed mb-1.5">{idea.text}</p>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-spectrum-warm" />
                <span className="text-xs text-accent truncate">{idea.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {track.versions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Versions</h3>
          {track.versions.map((v, i) => (
            <div key={v.id} className="rounded-xl border border-white/8 bg-surface-2 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-surface-3 text-accent-hover">v{v.version_number}</span>
                {i === 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 font-medium">latest</span>}
                {v.variant && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `${variantHue(v.variant)}22`, color: variantHue(v.variant) }}>{v.variant}</span>
                )}
                {v.tags.map((t) => <Tag key={t} label={t} />)}
              </div>
              <p className="text-sm text-white/80 mt-1.5">{v.description}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                <Avatar name={v.uploader} size="sm" />
                {v.uploader} · {timeAgo(v.at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {track.comments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Comments &amp; tasks</h3>
          {track.comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar name={c.author} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-white">{c.author}</span>
                  {c.timestamp_s != null && (
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent/20 text-accent-hover">{formatDuration(c.timestamp_s)}</span>
                  )}
                  <span className="text-xs text-muted">{timeAgo(c.at)}</span>
                </div>
                <p className="text-sm text-white/80 mt-1">{c.body}</p>
                {c.task && (
                  <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-surface-3/70 border border-white/8">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${c.task.done ? 'bg-accent border-accent text-white' : 'border-white/30 text-transparent'}`}>✓</span>
                    <span className={`text-xs flex-1 ${c.task.done ? 'line-through text-muted' : 'text-white/90'}`}>{c.task.title}</span>
                    <span className="flex items-center gap-1 text-xs text-muted"><Avatar name={c.task.assignee} size="sm" />{c.task.assignee}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted/70 pt-1">This is sample content. Create or join a real project to comment, assign tasks and upload audio.</p>
    </div>
  )
}
