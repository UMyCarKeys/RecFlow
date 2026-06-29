import { useState } from 'react'
import { Switch } from '@/components/ui/Switch'
import { usePlayerStore } from '@/store/playerStore'
import { groupVariants, variantHue, type VariantLine } from '@/lib/variants'
import type { Version } from '@/types/database'

interface CompareLinesProps {
  versions: Version[]
  trackTitle: string
  activeVersionId: string | null
  onSelectVersion: (id: string) => void
}

/**
 * Side-by-side parallel lines of inspiration. Click a line to load its comments;
 * play it through the bottom player. With A/B lock on, switching lines keeps the
 * current playback position so you compare the exact same moment.
 */
export function CompareLines({ versions, trackTitle, activeVersionId, onSelectVersion }: CompareLinesProps) {
  const lines = groupVariants(versions)
  const { activeVersionId: playingId, isPlaying, progress, setActive } = usePlayerStore()
  const [abLock, setAbLock] = useState(false)

  if (lines.length === 0) return null

  const playLine = (line: VariantLine) => {
    setActive(line.latest.id, `${trackTitle} — ${line.label}`, abLock ? progress : 0)
    onSelectVersion(line.latest.id)
  }

  return (
    <div id="compare-lines" className="card-glass border border-black/[0.06] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-[#6b6275] uppercase tracking-wider">Lines of inspiration</h3>
          <p className="text-[11px] text-[#9a8fa3] mt-0.5">Explore parallel takes — you'll commit to one past Mix.</p>
        </div>
        {lines.length > 1 && <Switch checked={abLock} onChange={setAbLock} label="A/B lock" />}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {lines.map((line) => {
          const hue = variantHue(line.variant)
          const playingLine = playingId === line.latest.id
          const selected = activeVersionId === line.latest.id
          return (
            <div
              key={line.label}
              onClick={() => onSelectVersion(line.latest.id)}
              className={`rounded-lg p-3 cursor-pointer transition-colors border ${
                selected ? 'border-accent/50 bg-accent/10' : 'field-glass border-black/[0.06] hover:border-black/[0.12]'
              }`}
            >
              <div className="flex items-center gap-2">
                <MiniDisc hue={hue} spinning={playingLine && isPlaying} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#1a1620] font-medium truncate">{line.label}</p>
                  <p className="text-[11px] text-[#6b6275]">
                    v{line.latest.version_number} · {line.versions.length} take{line.versions.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  playLine(line)
                }}
                className="mt-2 w-full rounded-md py-1.5 text-xs font-medium transition-colors"
                style={{ background: `${hue}22`, color: hue }}
              >
                {playingLine && isPlaying ? 'Playing…' : '▶ Play'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MiniDisc({ hue, spinning }: { hue: string; spinning: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={`w-8 h-8 flex-shrink-0 ${spinning ? 'animate-[spin_3s_linear_infinite]' : ''}`}>
      <circle cx="16" cy="16" r="15" fill="#ddd0db" />
      <circle cx="16" cy="16" r="11" fill="none" stroke="#000000" strokeOpacity="0.06" strokeWidth="0.5" />
      <circle cx="16" cy="16" r="6" fill={hue} fillOpacity="0.9" />
      <circle cx="16" cy="16" r="1.5" fill="#2a2433" />
    </svg>
  )
}
