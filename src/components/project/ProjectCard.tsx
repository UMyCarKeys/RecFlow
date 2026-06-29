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
                    className={`absolute ${CORNER_POS[m.corner]}`}
                    style={{ transform: `rotate(${m.rot}deg) scale(${m.scale})`, color: m.color, opacity: 0.72 }}
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
      return (
        <svg viewBox="0 0 24 16" className="h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M11 3 A5 5 0 1 0 11 13" />
          <path d="M4 8 H9" />
          <path d="M22 3 A5 5 0 1 0 22 13" />
          <path d="M15 8 H20" />
        </svg>
      )
    case 'fcc':
      return <span className="text-[10px] font-extrabold tracking-tight">FCC</span>
    case 'ccc':
      return (
        <svg viewBox="0 0 28 16" className="h-4" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M9 3 A5 5 0 1 0 9 13" />
          <path d="M16 3 A5 5 0 1 0 16 13" />
          <path d="M23 3 A5 5 0 1 0 23 13" />
        </svg>
      )
    case 'e9':
      return (
        <svg viewBox="0 0 22 16" className="h-4" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="6" cy="8" r="5" />
          <text x="6" y="10.5" fontSize="6.5" textAnchor="middle" fill="currentColor" stroke="none">E</text>
          <text x="16" y="11" fontSize="8" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="700">9</text>
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
    case 'caution':
      return (
        <span className="inline-flex items-center gap-1 text-[6px] font-bold tracking-[0.16em] border border-current rounded-[2px] px-1 leading-[1.7]">
          ▲ CAUTION ▲
        </span>
      )
    case 'reg':
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="8" cy="8" r="4" />
          <path d="M8 0v16M0 8h16" />
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
    case 'stereoArrows':
      return <span className="inline-flex items-center gap-1 text-[8px] font-extrabold tracking-[0.14em]">◄ STEREO ►</span>
    case 'stereoOutline':
      return (
        <span
          className="text-[9px] font-extrabold tracking-[0.18em]"
          style={{ WebkitTextStroke: '0.5px currentColor', color: 'transparent' }}
        >
          STEREO
        </span>
      )
    case 'stereoItalic':
      return <span className="text-[9px] italic font-black tracking-[0.1em]">STEREO</span>
    case 'stereoBoxed':
      return (
        <span
          className="text-[7px] font-extrabold tracking-[0.18em] px-1 py-[1px] rounded-[1px]"
          style={{ background: 'currentColor', color: '#1a1620' }}
        >
          STEREO
        </span>
      )
    case 'stereoSerif':
      return <span className="text-[9px] font-serif font-bold tracking-[0.08em]">STEREO</span>
    case 'stereoClef':
      return (
        <span className="inline-flex items-center gap-0.5 text-[8px] font-bold tracking-[0.14em]">
          <span className="text-[11px] leading-none">♪</span>STEREO
        </span>
      )
    case 'flower':
      return (
        <svg viewBox="0 0 18 18" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="9" cy="9" r="3" />
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (Math.PI / 3) * i
            return <circle key={i} cx={9 + Math.cos(a) * 4} cy={9 + Math.sin(a) * 4} r="3" />
          })}
        </svg>
      )
    case 'asterisk':
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (Math.PI / 4) * i
            return <line key={i} x1="8" y1="8" x2={8 + Math.cos(a) * 6} y2={8 + Math.sin(a) * 6} />
          })}
        </svg>
      )
    case 'nestedSquares':
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="1" y="1" width="14" height="14" />
          <rect x="4" y="4" width="8" height="8" />
          <rect x="6.5" y="6.5" width="3" height="3" />
        </svg>
      )
    case 'concentric':
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="8" cy="8" r="7" />
          <circle cx="8" cy="8" r="4.5" />
          <circle cx="8" cy="8" r="2" />
        </svg>
      )
    case 'chevrons':
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3 l4 5 -4 5 M8 3 l4 5 -4 5" />
        </svg>
      )
    case 'grid':
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="0.8">
          <path d="M1 5h14M1 9h14M1 13h14M5 1v14M9 1v14M13 1v14" />
        </svg>
      )
    case 'seihin':
      return <span className="text-[11px] font-semibold leading-none">製品</span>
    case 'sizes':
      return (
        <div className="flex gap-[2px]">
          {['S', 'M', 'L', 'XL'].map((s) => (
            <span key={s} className="text-[6px] font-semibold border border-current rounded-[1px] px-[2px] leading-[1.5]">
              {s}
            </span>
          ))}
        </div>
      )
    case 'iospec':
      return (
        <div className="border border-current rounded-[2px] px-1 py-[1px] font-mono text-[6px] leading-[1.5]">
          <div>IN 12V</div>
          <div>OUT 3A</div>
        </div>
      )
    case 'prohibit':
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.3">
          <circle cx="8" cy="8" r="6" />
          <path d="M3.8 3.8 L12.2 12.2" />
        </svg>
      )
    case 'copyright':
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="8" cy="8" r="6.5" />
          <text x="8" y="11" fontSize="8" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="700">P</text>
        </svg>
      )
    case 'halftone':
      return (
        <svg viewBox="0 0 24 16" className="w-6 h-4" fill="currentColor">
          {Array.from({ length: 6 }).flatMap((_, row) =>
            Array.from({ length: 9 }).map((__, col) => (
              <circle key={`${row}-${col}`} cx={col * 2.6 + 1.5} cy={row * 2.6 + 1.5} r={(row + col) % 3 ? 0.6 : 1.1} />
            )),
          )}
        </svg>
      )
    case 'download':
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 1 v8 M5 6 l3 3 3-3 M2 13 h12" />
        </svg>
      )
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
