import { useState } from 'react'
import { motion } from 'framer-motion'
import { STAGE_VALUE, STAGE_LABEL } from '@/lib/progress'
import { trackHue } from '@/lib/trackColor'
import type { Track } from '@/types/database'

interface VinylRecordProps {
  tracks: Track[]
  projectName: string
  onSelect: (track: Track) => void
}

const LABEL_R = 18
const OUTER_R = 47

/**
 * The project as a single large floating vinyl record. Each track is a
 * concentric ring (outer ring = first track); a saturated arc fills around the
 * ring proportional to that track's stage progress. Rings are hoverable and
 * clickable to dive into a track.
 */
export function VinylRecord({ tracks, projectName, onSelect }: VinylRecordProps) {
  const [hover, setHover] = useState<string | null>(null)
  const n = Math.max(tracks.length, 1)
  const ringThk = (OUTER_R - LABEL_R) / n
  const hovered = tracks.find((t) => t.id === hover) ?? null

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        className="relative aspect-square w-full max-w-[min(68vh,560px)]"
        style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.55))' }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Rotating vinyl body + grooves */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 animate-[spin_120s_linear_infinite]">
          <defs>
            <radialGradient id="vinylBody" cx="40%" cy="36%" r="72%">
              <stop offset="0%" stopColor="#f3ecf1" />
              <stop offset="55%" stopColor="#e2d6e0" />
              <stop offset="100%" stopColor="#cfc0cd" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="49" fill="url(#vinylBody)" />
          {Array.from({ length: 36 }).map((_, i) => {
            const r = LABEL_R + (i / 36) * (OUTER_R - LABEL_R)
            return <circle key={i} cx="50" cy="50" r={r} fill="none" stroke="#000000" strokeOpacity="0.05" strokeWidth="0.25" />
          })}
        </svg>

        {/* Static rings: grey base + colored progress arc + hit area */}
        <svg viewBox="0 0 100 100" className="absolute inset-0">
          {tracks.map((t, i) => {
            const ringOuter = OUTER_R - i * ringThk
            const rc = ringOuter - ringThk / 2
            const hue = trackHue(t.id)
            const prog = STAGE_VALUE[t.stage] ?? 0
            const isH = hover === t.id
            const w = ringThk * 0.66
            return (
              <g
                key={t.id}
                className="cursor-pointer"
                onMouseEnter={() => setHover(t.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(t)}
              >
                <circle
                  cx="50" cy="50" r={rc} fill="none"
                  stroke="#000000" strokeOpacity={isH ? 0.16 : 0.08} strokeWidth={w}
                  style={{ pointerEvents: 'none' }}
                />
                <circle
                  cx="50" cy="50" r={rc} fill="none"
                  stroke={hue} strokeWidth={isH ? w * 1.15 : w} strokeLinecap="round"
                  pathLength={1} strokeDasharray={`${prog} 1`}
                  transform="rotate(-90 50 50)"
                  style={{
                    pointerEvents: 'none',
                    opacity: 0.5 + prog * 0.5,
                    filter: isH ? `drop-shadow(0 0 2px ${hue})` : 'none',
                    transition: 'stroke-width 0.2s, opacity 0.2s',
                  }}
                />
                <circle cx="50" cy="50" r={rc} fill="none" stroke="transparent" strokeWidth={ringThk} style={{ pointerEvents: 'stroke' }} />
              </g>
            )
          })}

          {/* Center label */}
          <circle cx="50" cy="50" r={LABEL_R - 1} fill="#1a1620" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="2" fill="#08060c" />
        </svg>

        {/* Center label text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="max-w-[28%] text-center text-[11px] leading-tight font-medium text-white/90 line-clamp-3">
            {projectName}
          </span>
        </div>
      </motion.div>

      {/* Hovered track caption */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
        <motion.div
          initial={false}
          animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 6 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-2 rounded-full glass-light border border-black/10 flex items-center gap-2.5"
        >
          {hovered && (
            <>
              <span className="w-2 h-2 rounded-full" style={{ background: trackHue(hovered.id) }} />
              <span className="text-sm text-[#1a1620] font-medium">{hovered.title}</span>
              <span className="text-xs text-[#6b6275]">{STAGE_LABEL[hovered.stage]}</span>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
