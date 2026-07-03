import { create } from 'zustand'

/**
 * Drives the dashboard → project "sleeve" transition: the clicked card's cover
 * flies to centre-front, the vinyl slides out of it, then hands off to the 3D
 * VinylScene on the project page. The overlay lives in AppShell so it survives
 * the route change; ProjectCard starts it with the card's screen rect.
 */
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
