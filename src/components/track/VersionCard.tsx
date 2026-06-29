import { usePlayerStore } from '@/store/playerStore'
import { Avatar } from '@/components/ui/Avatar'
import { Tag } from '@/components/ui/Tag'
import { formatBytes, formatDuration, timeAgo } from '@/lib/utils'
import { displayName } from '@/lib/displayName'
import { variantHue } from '@/lib/variants'
import type { Version } from '@/types/database'

interface VersionCardProps {
  version: Version
  trackTitle: string
  isLatest: boolean
}

export function VersionCard({ version, trackTitle, isLatest }: VersionCardProps) {
  const { activeVersionId, setActive, isPlaying, setIsPlaying } = usePlayerStore()
  const isActive = activeVersionId === version.id

  const handlePlay = () => {
    // If this version is already loaded, toggle play/pause. Re-calling setActive
    // reset the player (blob refetch never re-fired for the same id), which froze
    // the bottom player on a spinner and reset the position to 0:00.
    if (isActive) {
      setIsPlaying(!isPlaying)
      return
    }
    setActive(version.id, `${trackTitle} (v${version.version_number})`)
  }

  return (
    <div
      id={`version-card-${version.id}`}
      className={`rounded-xl border p-4 transition-colors ${
        isActive
          ? 'bg-accent/15 border-accent/40'
          : 'card-glass border-black/[0.06] hover:border-black/[0.12]'
      }`}
    >
      <div id={`version-${version.id}-body`} className="flex items-start gap-3">
        <button
          onClick={handlePlay}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isActive ? 'bg-accent text-white' : 'bg-black/[0.05] text-[#6b6275] hover:text-accent hover:bg-accent/15'
          }`}
          aria-label={isActive && isPlaying ? `Pause version ${version.version_number}` : `Play version ${version.version_number}`}
        >
          {isActive && isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2.5" y="2" width="3" height="10" rx="1" />
              <rect x="8.5" y="2" width="3" height="10" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 2.5l8 4.5-8 4.5V2.5z" />
            </svg>
          )}
        </button>

        <div id={`version-${version.id}-meta`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-black/[0.05] text-accent">
              v{version.version_number}
            </span>
            {isLatest && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 font-medium">latest</span>
            )}
            {version.variant && (
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: `${variantHue(version.variant)}22`, color: variantHue(version.variant) }}
              >
                {version.variant}
              </span>
            )}
            {version.tags.map((t) => <Tag key={t} label={t} />)}
          </div>

          {version.description && (
            <p className="text-sm text-[#3a3340] mt-1.5 leading-relaxed">{version.description}</p>
          )}

          <div id={`version-${version.id}-byline`} className="flex items-center gap-3 mt-2">
            <Avatar src={version.profiles?.avatar_url} name={displayName(version.profiles)} size="sm" />
            <span className="text-xs text-[#6b6275]">{displayName(version.profiles)}</span>
            <span className="text-xs text-[#6b6275]">{timeAgo(version.created_at)}</span>
            {version.file_size && <span className="text-xs text-[#6b6275]">{formatBytes(version.file_size)}</span>}
            {version.duration && <span className="text-xs text-[#6b6275]">{formatDuration(version.duration)}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
