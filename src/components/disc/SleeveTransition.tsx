import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { coverSpec } from '@/lib/cover'
import { useSleeveTransition, type SleeveStart } from '@/store/sleeveTransition'

/**
 * The dashboard → project transition overlay. Timeline (seconds):
 *   0.00–0.50  sleeve flies from the clicked card to centre-front
 *   0.50       route changes underneath — VinylScene mounts and the REAL 3D
 *              disc starts small behind this sleeve, slides up out of it and
 *              flies to its stage pose (see the entrance logic in VinylScene)
 *   1.00–1.45  sleeve fades away, leaving the 3D vinyl in place
 * Rendered from AppShell so it survives the route change; pointer-events none.
 */
const FLY_S = 0.42
const DOWN_S = 0.62
const NAV_MS = 420
const DONE_MS = 1300

// Gentle easeInOut — glides to centre instead of the sharp quint decel.
const EASE = [0.5, 0.05, 0.2, 1] as const
// easeIn — the sleeve accelerates down and off-screen.
const DOWN_EASE = [0.4, 0, 1, 1] as const

export function SleeveTransition() {
  const active = useSleeveTransition((s) => s.active)
  const clear = useSleeveTransition((s) => s.clear)
  const navigate = useNavigate()

  useEffect(() => {
    if (!active) return
    const nav = setTimeout(() => navigate(`/project/${active.projectId}`), NAV_MS)
    const done = setTimeout(clear, DONE_MS)
    return () => {
      clearTimeout(nav)
      clearTimeout(done)
    }
  }, [active, navigate, clear])

  if (!active) return null
  return <Overlay key={active.projectId} data={active} />
}

function Overlay({ data }: { data: SleeveStart }) {
  // Centre-front target for the sleeve, computed once at start.
  const target = useMemo(() => {
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.44
    return { size, x: (window.innerWidth - size) / 2, y: (window.innerHeight - size) / 2 }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, pointerEvents: 'none' }}>
      {/* down-slide: once at centre (≈ when the scene mounts and the vinyl starts
          rising), the sleeve accelerates down and out of view — the two pass in
          opposite directions. */}
      <motion.div
        style={{ position: 'fixed', inset: 0 }}
        initial={{ y: 0 }}
        animate={{ y: window.innerHeight * 1.15 }}
        transition={{ delay: FLY_S, duration: DOWN_S, ease: DOWN_EASE }}
      >
        <motion.div
          style={{ position: 'absolute', left: 0, top: 0 }}
          initial={{ x: data.rect.x, y: data.rect.y, width: data.rect.w, height: data.rect.h }}
          animate={{ x: target.x, y: target.y, width: target.size, height: target.size }}
          transition={{ duration: FLY_S, ease: EASE }}
        >
          <div style={{ position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden' }}>
            <SleeveFace coverUrl={data.coverUrl} seed={data.projectId} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

// The sleeve's face: styled identically to the dashboard's frosted-glass tile
// (heavily diffused art + frosted film + warm key light) so the lift-off from
// the card is seamless.
function SleeveFace({ coverUrl, seed }: { coverUrl: string | null; seed: string }) {
  const bg = useMemo(() => {
    if (coverUrl) return null
    const spec = coverSpec(seed)
    return spec.blobs
      .map((b) => `radial-gradient(circle at ${b.x}% ${b.y}%, ${b.color}${b.alpha} 0%, ${b.color}00 ${b.spread}%)`)
      .concat([
        `linear-gradient(${spec.sweepAngle}deg, ${spec.sweep}33 0%, transparent 60%)`,
        'linear-gradient(135deg, #241f2b, #1a1620)',
      ])
      .join(', ')
  }, [coverUrl, seed])

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, transform: 'scale(1.4)', filter: 'blur(26px) saturate(1.3) brightness(1.12)' }}>
        {coverUrl ? (
          <img src={coverUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: bg ?? undefined }} />
        )}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.06)' }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 26% 16%, rgba(255,206,158,0.55) 0%, rgba(255,206,158,0) 58%)',
          mixBlendMode: 'soft-light',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(125deg, rgba(255,244,230,0.28) 0%, rgba(255,255,255,0) 38%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 12,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(26,22,32,0.18)',
        }}
      />
    </>
  )
}

