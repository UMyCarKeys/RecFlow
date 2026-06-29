import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { coverSpec } from '@/lib/cover'
import type { Project } from '@/types/database'

interface ProjectCardProps {
  project: Project
  progress?: number // 0..1
}

export function ProjectCard({ project, progress = 0 }: ProjectCardProps) {
  const spec = useMemo(() => coverSpec(project.id), [project.id])
  const pct = Math.round(progress * 100)

  const blobBg = spec.blobs
    .map((b) => `radial-gradient(circle at ${b.x}% ${b.y}%, ${b.color}${b.alpha} 0%, ${b.color}00 ${b.spread}%)`)
    .concat(['linear-gradient(135deg, #241f2b, #1a1620)'])
    .join(', ')

  return (
    <motion.div
      id={`project-card-${project.id}`}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
    >
      <Link to={`/project/${project.id}`} className="block group/card">
        {/* Sleeve + peeking record */}
        <div className="relative">
          {/* Record peeking from behind the sleeve, slides further on hover */}
          <div
            id={`project-${project.id}-disc`}
            className="absolute left-1/2 -top-3 w-[62%] aspect-square -translate-x-1/2 transition-transform duration-500 ease-out group-hover/card:-translate-y-2"
            style={{ transform: `translateX(-50%) rotate(${spec.discTilt}deg)` }}
          >
            <VinylMark />
          </div>

          {/* Sleeve face (square) */}
          <div
            id={`project-${project.id}-cover`}
            className="relative aspect-square rounded-xl overflow-hidden border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
          >
            {project.cover_url ? (
              <img src={project.cover_url} alt={project.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                {/* Washed generative gradient blobs */}
                <div className="absolute inset-0" style={{ backgroundImage: blobBg }} />

                {/* Generative shapes (washed + soft) */}
                {spec.shapes.map((s, i) => (
                  <GenShape key={i} shape={s} />
                ))}

                {/* Frosted wash to keep colors muted/washed */}
                <div className="absolute inset-0 bg-surface/30" />

                {/* Grain texture */}
                <div
                  className="absolute inset-0 mix-blend-soft-light opacity-20"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    backgroundSize: '160px 160px',
                  }}
                />

                {/* Center record symbol so it always reads as a record sleeve */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.22]">
                  <VinylMark />
                </div>
              </>
            )}

            {/* Record-square glyph badge (corner) */}
            <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-[5px] border border-white/30 flex items-center justify-center backdrop-blur-sm bg-black/15">
              <span className="w-2 h-2 rounded-full border border-white/50" />
            </div>

            {/* Progress ring badge (corner) */}
            <div className="absolute top-2.5 right-2.5 text-[10px] font-medium text-white/85 px-1.5 py-0.5 rounded-full bg-black/25 backdrop-blur-sm">
              {pct}%
            </div>
          </div>
        </div>

        {/* Title + progress bar */}
        <div id={`project-${project.id}-info`} className="px-1 pt-3">
          <h3 className="font-medium text-white text-sm truncate">{project.name}</h3>
          {project.description && (
            <p className="text-xs text-muted mt-0.5 line-clamp-1 font-light">{project.description}</p>
          )}
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-spectrum-warm transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function GenShape({ shape }: { shape: import('@/lib/cover').CoverShape }) {
  const base = 'absolute blur-[2px] mix-blend-screen'
  const style: React.CSSProperties = {
    left: `${shape.x}%`,
    top: `${shape.y}%`,
    width: `${shape.size}%`,
    opacity: shape.opacity,
    transform: `translate(-50%, -50%) rotate(${shape.rot}deg)`,
  }
  if (shape.kind === 'circle') {
    return <div className={`${base} rounded-full aspect-square`} style={{ ...style, background: shape.color }} />
  }
  if (shape.kind === 'bar') {
    return <div className={base} style={{ ...style, height: `${shape.size * 0.18}%`, background: shape.color, borderRadius: 999 }} />
  }
  // triangle
  return (
    <div
      className={base}
      style={{ ...style, aspectRatio: '1', background: shape.color, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
    />
  )
}

/** A faded vinyl record graphic — grooves, label, spindle hole. */
function VinylMark() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="vinylSheen" cx="38%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#3a3340" />
          <stop offset="55%" stopColor="#15121a" />
          <stop offset="100%" stopColor="#0a080f" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="url(#vinylSheen)" />
      {[44, 39, 34, 29, 24].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.6" />
      ))}
      <circle cx="50" cy="50" r="14" fill="#ff8a6b" fillOpacity="0.85" />
      <circle cx="50" cy="50" r="2.2" fill="#0a080f" />
    </svg>
  )
}
