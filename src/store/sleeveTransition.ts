import { create } from 'zustand'

/**
 * Drives the dashboard → project "sleeve" transition: the clicked card's cover
 * flies to centre-front, the vinyl slides out of it, then hands off to the 3D
 * VinylScene on the project page. The overlay lives in AppShell so it survives
 * the route change; ProjectCard starts it with the card's screen rect.
 */

// Duration (seconds) of VinylScene's sleeve→vinyl entrance tumble (see the
// `entrance` ref in Record(), VinylScene.tsx). Kept here — a tiny,
// dependency-free store module — rather than exported from VinylScene.tsx
// itself, so page-level UI that just wants to time a reveal against it (e.g.
// ProjectPage's header) doesn't have to import anything from the file that
// pulls in three.js/@react-three (which is lazy-loaded separately from the
// rest of the app).
export const DISC_ENTRANCE_S = 1.05

// Overlay timeline (ms), shared with SleeveTransition.tsx: route change happens
// at SLEEVE_NAV_MS; the transition store clears at SLEEVE_DONE_MS.
export const SLEEVE_NAV_MS = 420
export const SLEEVE_DONE_MS = 1300

/** How much earlier than the disc's full settle the UI/text reveal begins —
 * the fade overlaps the tail of the entrance instead of waiting it out. */
export const REVEAL_LEAD_S = 0.9

/** Seconds after the transition clears until the scene enables its 3D text. */
export const TEXT_REVEAL_AFTER_CLEAR_S = Math.max(0, DISC_ENTRANCE_S + 0.12 - REVEAL_LEAD_S)

/**
 * Seconds AFTER ProjectPage mounts (which happens ≈ SLEEVE_NAV_MS into the
 * transition) until the in-scene 3D text starts fading in. Page UI
 * (ProjectPage's header) delays its own reveal by this same amount so the
 * header and the on-record text arrive together.
 */
export const UI_REVEAL_DELAY_S = (SLEEVE_DONE_MS - SLEEVE_NAV_MS) / 1000 + TEXT_REVEAL_AFTER_CLEAR_S
export interface SleeveStart {
  projectId: string
  coverUrl: string | null
  rect: { x: number; y: number; w: number; h: number }
}

interface SleeveTransitionState {
  active: SleeveStart | null
  launched: boolean
  consumed: boolean
  pendingClear: boolean
  start: (s: SleeveStart) => void
  acknowledge: () => void
  clear: () => void
}

export const useSleeveTransition = create<SleeveTransitionState>((set) => ({
  active: null,
  launched: false,
  consumed: false,
  pendingClear: false,
  start: (active) => set({ active, launched: true, consumed: false, pendingClear: false }),
  acknowledge: () =>
    set((state) => {
      if (state.pendingClear) {
        return { active: null, launched: false, consumed: false, pendingClear: false }
      }
      return { ...state, consumed: true }
    }),
  clear: () =>
    set((state) => {
      if (state.consumed) {
        return { active: null, launched: false, consumed: false, pendingClear: false }
      }
      return { ...state, pendingClear: true }
    }),
}))
