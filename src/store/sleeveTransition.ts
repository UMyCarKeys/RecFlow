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
export interface SleeveStart {
  projectId: string
  coverUrl: string | null
  rect: { x: number; y: number; w: number; h: number }
}

interface SleeveTransitionState {
  active: SleeveStart | null
  start: (s: SleeveStart) => void
  clear: () => void
}

export const useSleeveTransition = create<SleeveTransitionState>((set) => ({
  active: null,
  start: (active) => set({ active }),
  clear: () => set({ active: null }),
}))
