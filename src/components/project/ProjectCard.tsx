import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { coverSpec } from '@/lib/cover'
import type { Corner, MarkId } from '@/lib/cover'
import type { Project } from '@/types/database'

interface ProjectCardProps {
  project: Project
  progress?: number // 0..1
}

const CORNER_POS: Record<Corner, string> = {
  tl: 'top-2.5 left-2.5',
  tr: 'top-2.5 right-2.5',
  bl: 'bottom-9 left-2.5',
  br: 'bottom-9 right-2.5',
}

export function ProjectCard({ project, progress = 0 }: ProjectCardProps) {
  const spec = useMemo(() => coverSpec(project.id), [project.id])
  const pct = Math.round(progress * 100)

  const blobBg = spec.blobs
    .map((b) => `radial-gradient(circle at ${b.x}% ${b.y}%, ${b.color}${b.alpha} 0%, ${b.color}00 ${b.spread}%)`)
    .concat([
      `linear-gradient(${spec.sweepAngle}deg, ${spec.sweep}33 0%, transparent 60%)`,
      'linear-gradient(135deg, #241f2b, #1a1620)',
    ])
    .join(', ')

  return (
    <motion.div
      id={`project-card-${project.id}`}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
    >
      <Link to={`/project/${project.id}`} className="block group/card">
        <div className="relative">
          {/* Record peeking from behind the sleeve, slides out on hover */}
          <div
            id={`project-${project.id}-disc`}
            className="absolute left-1/2 -top-3 w-[60%] aspect-square transition-transform duration-500 ease-out group-hover/card:-translate-y-2.5"
            style={{ transform: `translateX(-50%) rotate(${spec.discTilt}deg)` }}
          >
            <VinylMark />
          </div>

          {/* Sleeve face (square, matte printed) */}
          <div
            id={`project-${project.id}-cover`}
            className="relative aspect-square rounded-xl overflow-hidden border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
          >
            {project.cover_url ? (
              <img src={project.cover_url} alt={project.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                {/* Smooth washed gradient field */}
                <div className="absolute inset-0" style={{ backgroundImage: blobBg }} />

                {/* Frosted wash to keep colors muted / printed */}
                <div className="absolute inset-0 bg-surface/25" />

                {/* Printed paper grain */}
                <div
                  className="absolute inset-0 mix-blend-soft-light opacity-25"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    backgroundSize: '160px 160px',
                  }}
                />

                {/* Randomized technical print marks in the corners */}
                {spec.marks.map((m, i) => (
                  <div
                    key={i}
                    className={`absolute ${CORNER_POS[m.corner]} text-ink/55`}
                    style={{ transform: `rotate(${m.rot}deg) scale(${m.scale})` }}
                  >
                    <MarkGlyph id={m.id} code={spec.code} />
                  </div>
                ))}
              </>
            )}

            {/* Progress — contained within the cover square */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-black/35 overflow-hidden">
                <div
                  className="h-full rounded-full bg-spectrum-warm transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-white/90 tabular-nums">{pct}%</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div id={`project-${project.id}-info`} className="px-1 pt-3">
          <h3 className="font-medium text-white text-sm truncate">{project.name}</h3>
          {project.description && (
            <p className="text-xs text-muted mt-0.5 line-clamp-1 font-light">{project.description}</p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

/* ---- Technical print marks (screen-printed record-sleeve aesthetic) ---- */

function MarkGlyph({ id, code }: { id: MarkId; code: string }) {
  switch (id) {
    case 'barcode':
      return (
        <svg viewBox="0 0 44 16" className="w-11 h-4" fill="currentColor">
          {[0, 2, 3, 6, 8, 9, 12, 15, 16, 19, 21, 24, 26, 27, 30, 33, 35, 38, 40, 43].map((x, i) => (
            <rect key={i} x={x} y="0" width={i % 3 === 0 ? 1.4 : 0.7} height="16" />
          ))}
        </svg>
      )
    case 'ce':
      return <span className="text-[11px] font-extrabold tracking-tighter">CE</span>
    case 'reg':
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="8" cy="8" r="4" />
          <path d="M8 0v16M0 8h16" />
        </svg>
      )
    case 'hazard':
      return (
        <svg viewBox="0 0 18 16" className="w-[18px] h-4" fill="none" stroke="currentColor" strokeWidth="1.1">
          <path d="M9 1.5 L16.5 14.5 H1.5 Z" strokeLinejoin="round" />
          <path d="M9 6v4" strokeLinecap="round" />
          <circle cx="9" cy="12" r="0.4" fill="currentColor" />
        </svg>
      )
    case 'globe':
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="0.8">
          <circle cx="8" cy="8" r="7" />
          <ellipse cx="8" cy="8" rx="3" ry="7" />
          <path d="M1 8h14M2.5 4h11M2.5 12h11" />
        </svg>
      )
    case 'colorbars':
      return (
        <div className="flex gap-[2px]">
          {['#ff8a6b', '#ffc46b', '#6fd6c4', '#b88cff', '#f4ece8'].map((c) => (
            <span key={c} className="w-[3px] h-3.5 rounded-[1px]" style={{ background: c }} />
          ))}
        </div>
      )
    case 'stereo':
      return <span className="text-[8px] font-extrabold tracking-[0.22em]">STEREO</span>
    case 'seihin':
      return <span className="text-[11px] font-semibold leading-none">製品</span>
    case 'code':
    default:
      return <span className="font-mono text-[8px] tracking-wide">{code}</span>
  }
}

/** A faded vinyl record graphic — used only for the record peeking from the sleeve. */
function VinylMark() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="vinylBody" cx="42%" cy="40%" r="68%">
          <stop offset="0%" stopColor="#2a2430" />
          <stop offset="60%" stopColor="#15121a" />
          <stop offset="100%" stopColor="#0a080f" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="url(#vinylBody)" />
      {[44, 39, 34, 29, 24].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.6" />
      ))}
      <circle cx="50" cy="50" r="14" fill="#ff8a6b" fillOpacity="0.8" />
      <circle cx="50" cy="50" r="2.2" fill="#0a080f" />
    </svg>
  )
}
