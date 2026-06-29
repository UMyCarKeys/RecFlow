import { usePlayerStore } from '@/store/playerStore'
import { Avatar } from '@/components/ui/Avatar'
import { Tag } from '@/components/ui/Tag'
import { formatBytes, formatDuration, timeAgo } from '@/lib/utils'
import { displayName } from '@/lib/displayName'
import type { Version } from '@/types/database'

interface VersionCardProps {
  version: Version
  trackTitle: string
  isLatest: boolean
}

export function VersionCard({ version, trackTitle, isLatest }: VersionCardProps) {
  const { activeVersionId, setActive } = usePlayerStore()
  const isActive = activeVersionId === version.id

  const handlePlay = () => {
    setActive(version.id, `${trackTitle} (v${version.version_number})`)
  }

  return (
    <div
      id={`version-card-${version.id}`}
      className={`rounded-xl border p-4 transition-colors ${
        isActive
          ? 'bg-accent/10 border-accent/40'
          : 'bg-surface-2 border-white/8 hover:border-white/16'
      }`}
    >
      <div id={`version-${version.id}-body`} className="flex items-start gap-3">
        <button
          onClick={handlePlay}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isActive ? 'bg-accent text-white' : 'bg-surface-3 text-muted hover:text-white hover:bg-accent/30'
          }`}
          aria-label={`Play version ${version.version_number}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M3 2.5l8 4.5-8 4.5V2.5z" />
          </svg>
        </button>

        <div id={`version-${version.id}-meta`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-surface-3 text-accent-hover">
              v{version.version_number}
            </span>
            {isLatest && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 font-medium">latest</span>
            )}
            {version.tags.map((t) => <Tag key={t} label={t} />)}
          </div>

          {version.description && (
            <p className="text-sm text-white/80 mt-1.5 leading-relaxed">{version.description}</p>
          )}

          <div id={`version-${version.id}-byline`} className="flex items-center gap-3 mt-2">
            <Avatar src={version.profiles?.avatar_url} name={displayName(version.profiles)} size="sm" />
            <span className="text-xs text-muted">{displayName(version.profiles)}</span>
            <span className="text-xs text-muted">{timeAgo(version.created_at)}</span>
            {version.file_size && <span className="text-xs text-muted">{formatBytes(version.file_size)}</span>}
            {version.duration && <span className="text-xs text-muted">{formatDuration(version.duration)}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
