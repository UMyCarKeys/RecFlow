import { usePlayerStore } from '@/store/playerStore'
import { AudioPlayer } from '@/components/player/AudioPlayer'
import { PlayerControls } from '@/components/player/PlayerControls'

export function PlayerBar() {
  const { activeVersionId, activeTrackTitle, isLoading, loadPhase, loadProgress, progress, duration, reset } =
    usePlayerStore()

  if (!activeVersionId) return null

  const pct = Math.round(loadProgress * 100)
  const playedPct = duration ? (progress / duration) * 100 : 0
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
    <div
      id="player-bar"
      className="group/player fixed bottom-0 left-0 right-0 h-14 glass-light border-t border-black/[0.06] flex items-center px-4 gap-3 z-40"
    >
      {/* Load status bar — confirms work is happening after pressing play */}
      {isLoading && (
        <div id="player-bar-status" className="absolute top-0 left-0 right-0 h-[3px] bg-black/10 overflow-hidden">
          {loadPhase === 'download' && loadProgress > 0 ? (
            <div className="h-full bg-spectrum transition-[width] duration-150" style={{ width: `${pct}%` }} />
          ) : (
            <div className="h-full w-1/3 bg-spectrum animate-[indeterminate_1.1s_ease-in-out_infinite]" />
          )}
        </div>
      )}

      <div id="player-bar-track-info" className="flex-shrink-0 min-w-0 w-32">
        <p className={`text-[11px] truncate ${isLoading ? 'text-accent' : 'text-[#6b6275]'}`}>{statusLabel}</p>
        <p className="text-sm text-[#1a1620] font-medium truncate">{activeTrackTitle}</p>
      </div>

      <PlayerControls />

      {/* Recessed by default (thin progress line); reveals the waveform on hover */}
      <div className="relative flex-1 mx-1 h-9 flex items-center">
        <div className="absolute left-0 right-0 h-[3px] rounded-full bg-black/10 opacity-100 group-hover/player:opacity-0 transition-opacity duration-300">
          <div className="h-full rounded-full bg-spectrum" style={{ width: `${playedPct}%` }} />
        </div>
        <div className="absolute inset-0 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 pointer-events-none group-hover/player:pointer-events-auto">
          <AudioPlayer />
        </div>
      </div>

      <button
        id="player-bar-close"
        onClick={reset}
        className="flex-shrink-0 text-[#6b6275] hover:text-[#1a1620] transition-colors"
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
