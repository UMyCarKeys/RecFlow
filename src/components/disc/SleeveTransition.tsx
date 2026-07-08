import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { coverSpec, coverBackground } from '@/lib/cover'
import { useSleeveTransition, SLEEVE_NAV_MS, SLEEVE_DONE_MS, type SleeveStart } from '@/store/sleeveTransition'

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
// Route change + store clear moments live in the store module (shared with the
// page-UI reveal timing) so header/text sync can't drift from the overlay.
const NAV_MS = SLEEVE_NAV_MS
const DONE_MS = SLEEVE_DONE_MS

// Gentle easeInOut — glides to centre instead of the sharp quint decel.
const EASE = [0.5, 0.05, 0.2, 1] as const
// easeIn — the sleeve accelerates down and off-screen.
const DOWN_EASE = [0.4, 0, 1, 1] as const

export function SleeveTransition() {
  const active = useSleeveTransition((s) => s.active)
  const activeProjectId = active?.projectId ?? null
  const navigate = useNavigate()
  // navigate's identity changes when the route changes — which THIS transition
  // triggers at NAV_MS. Reading it through a ref (and keying the effect on the
  // project id string only) stops the effect from tearing down and re-running
  // mid-flight, which was double-logging "mounted overlay" and re-scheduling
  // the clear timer later than intended.
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  useEffect(() => {
    if (!activeProjectId) return
    const nav = setTimeout(() => navigateRef.current(`/project/${activeProjectId}`), NAV_MS)
    const done = setTimeout(() => useSleeveTransition.getState().clear(), DONE_MS)
    // Failsafe: if the scene never acknowledges (crash, fast back-navigation,
    // disc never became visible), force the handshake through so the store
    // can't be left stuck with a lingering invisible overlay. Firing at all is
    // an anomaly, so it warns (kept in production).
    const failsafe = setTimeout(() => {
      const st = useSleeveTransition.getState()
      if (st.active?.projectId === activeProjectId) {
        console.warn('[SleeveTransition] handshake never completed — failsafe clear', { projectId: activeProjectId })
        st.acknowledge() // pendingClear path fully resets; otherwise marks consumed
        const after = useSleeveTransition.getState()
        if (after.active) after.clear()
      }
    }, DONE_MS + 1500)
    return () => {
      clearTimeout(nav)
      clearTimeout(done)
      clearTimeout(failsafe)
    }
  }, [activeProjectId])

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
    // zIndex kept below PlayerBar (z-40, PlayerBar.tsx) so the persistent
    // player bar always stays above this transition's flying sleeve — and
    // above VinylScene's own canvas (z-5 normally) — instead of the sleeve's
    // down-slide passing in front of the player bar when a track is loaded.
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, pointerEvents: 'none' }}>
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
  // Only computed for seeded (non-uploaded) artwork — bg and pop stay null
  // when a real cover image is set, so it keeps its own colors untouched.
  const { bg, pop } = useMemo(() => {
    if (coverUrl) return { bg: null, pop: null }
    return coverBackground(coverSpec(seed))
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
      {/* Same seeded bright "pop" accent as the dashboard card (ProjectCard),
          so the sleeve doesn't visually change identity as it lifts off the
          card and flies to centre-front. */}
      {pop && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 88% 90%, ${pop}55 0%, ${pop}00 42%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}
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

