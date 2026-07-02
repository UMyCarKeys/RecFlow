import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { coverSpec } from '@/lib/cover'
import type { Project } from '@/types/database'
import { useSleeveTransition } from '@/store/sleeveTransition'

interface ProjectCardProps {
  project: Project
  progress?: number // 0..1
}

/**
 * Dashboard project tile: a frosted-glass slab. The cover art (uploaded or the
 * seeded generative field) shows through as heavily diffused light — a soft
 * gradient glow — with a warm key light shining onto the glass for immersion.
 * The old sharp print marks / grain / wear were removed with this restyle
 * (they live in git history if ever wanted back).
 */
export function ProjectCard({ project, progress = 0 }: ProjectCardProps) {
  const spec = useMemo(() => coverSpec(project.id), [project.id])
  const pct = Math.round(progress * 100)
  const startTransition = useSleeveTransition((s) => s.start)

  // Plain left-clicks play the sleeve transition (which navigates itself);
  // modified clicks (new tab etc.) keep normal link behaviour.
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    const cover = document.getElementById(`project-${project.id}-cover`)
    const r = (cover ?? e.currentTarget).getBoundingClientRect()
    startTransition({
      projectId: project.id,
      coverUrl: project.cover_url,
      rect: { x: r.left, y: r.top, w: r.width, h: r.height },
    })
  }

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
      <Link to={`/project/${project.id}`} className="block group/card" onClick={handleClick}>
        {/* Floating tile — gently hovers, seeded so cards don't bob in unison */}
        <motion.div
          className="relative"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: spec.float.dur, delay: spec.float.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            id={`project-${project.id}-cover`}
            className="relative aspect-square rounded-xl overflow-hidden border border-white/[0.14]"
          >
            {/* the art as diffused light — scaled up so the heavy blur has no hard edges */}
            <div
              className="absolute inset-0"
              style={{ transform: 'scale(1.4)', filter: 'blur(26px) saturate(1.3) brightness(1.12)' }}
            >
              {project.cover_url ? (
                <img src={project.cover_url} alt={project.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ backgroundImage: blobBg }} />
              )}
            </div>

            {/* frosted film over the glow */}
            <div className="absolute inset-0 bg-white/[0.06]" />

            {/* warm key light shining onto the glass (upper-left) */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 26% 16%, rgba(255,206,158,0.55) 0%, rgba(255,206,158,0) 58%)',
                mixBlendMode: 'soft-light',
              }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(125deg, rgba(255,244,230,0.28) 0%, rgba(255,255,255,0) 38%)' }}
            />

            {/* glass edge highlights — sells the 3D slab */}
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(26,22,32,0.18)' }}
            />

            {/* Title + description centered over the artwork */}
            <div
              id={`project-${project.id}-info`}
              className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none"
            >
              <h3 className="font-medium text-white text-sm truncate max-w-full drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-xs text-white/75 mt-0.5 line-clamp-1 font-light max-w-full drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
                  {project.description}
                </p>
              )}
            </div>

            {/* Progress at the bottom */}
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
        </motion.div>
      </Link>
    </motion.div>
  )
}
