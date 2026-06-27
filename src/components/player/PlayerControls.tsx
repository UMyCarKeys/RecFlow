import { usePlayerStore } from '@/store/playerStore'
import { formatDuration } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'

export function PlayerControls() {
  const { isPlaying, isLoading, progress, duration, setIsPlaying } = usePlayerStore()

  return (
    <div
      id="player-controls"
      className="flex items-center gap-3 flex-shrink-0"
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="text-xs text-muted tabular-nums">{formatDuration(progress)}</span>

      <button
        onClick={() => setIsPlaying(!isPlaying)}
        disabled={isLoading}
        className="w-9 h-9 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center transition-colors disabled:opacity-50"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <Spinner className="w-4 h-4" />
        ) : isPlaying ? (
          <PauseIcon />
        ) : (
          <PlayIcon />
        )}
      </button>

      <span className="text-xs text-muted tabular-nums">{formatDuration(duration)}</span>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M3 2.5l8 4.5-8 4.5V2.5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="2.5" y="2" width="3" height="10" rx="1" />
      <rect x="8.5" y="2" width="3" height="10" rx="1" />
    </svg>
  )
}
