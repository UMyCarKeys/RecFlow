import { usePlayerStore } from '@/store/playerStore'
import { AudioPlayer } from '@/components/player/AudioPlayer'
import { PlayerControls } from '@/components/player/PlayerControls'

export function PlayerBar() {
  const { activeVersionId, activeTrackTitle, isLoading, loadPhase, loadProgress, reset } = usePlayerStore()

  if (!activeVersionId) return null

  const pct = Math.round(loadProgress * 100)
  const statusLabel =
    loadPhase === 'request'
      ? 'Requesting…'
      : loadPhase === 'download'
        ? loadProgress > 0
          ? `Loading ${pct}%`
          : 'Loading…'
        : loadPhase === 'decode'
          ? 'Decoding…'
          : 'Now playing'

  return (
    <div id="player-bar" className="fixed bottom-0 left-0 right-0 h-16 bg-surface-1/95 backdrop-blur-md border-t border-white/8 flex items-center px-4 gap-4 z-40">
      {/* Load status bar — confirms work is happening after pressing play */}
      {isLoading && (
        <div id="player-bar-status" className="absolute top-0 left-0 right-0 h-[3px] bg-white/10 overflow-hidden">
          {loadPhase === 'download' && loadProgress > 0 ? (
            <div className="h-full bg-spectrum transition-[width] duration-150" style={{ width: `${pct}%` }} />
          ) : (
            <div className="h-full w-1/3 bg-spectrum animate-[indeterminate_1.1s_ease-in-out_infinite]" />
          )}
        </div>
      )}

      <div id="player-bar-track-info" className="flex-shrink-0 min-w-0">
        <p className={`text-xs truncate max-w-36 ${isLoading ? 'text-accent' : 'text-muted'}`}>{statusLabel}</p>
        <p className="text-sm text-white font-medium truncate max-w-36">{activeTrackTitle}</p>
      </div>

      <PlayerControls />
      <AudioPlayer />

      <button
        id="player-bar-close"
        onClick={reset}
        className="flex-shrink-0 text-muted hover:text-white transition-colors"
        aria-label="Close player"
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
