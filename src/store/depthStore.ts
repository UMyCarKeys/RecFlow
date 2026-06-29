import { create } from 'zustand'

/**
 * Tracks how "deep" the user has navigated into the zoom hierarchy:
 *   0 = dashboard (album covers)
 *   1 = project   (record with track grooves)
 *   2 = track     (single groove detail)
 *
 * The DepthBackground shader reads this every frame and smoothly zooms the
 * gradient world to match, so navigating deeper feels like physically diving in.
 */
interface DepthState {
  depth: number
  setDepth: (d: number) => void
}

export const useDepthStore = create<DepthState>((set) => ({
  depth: 0,
  setDepth: (depth) => set({ depth }),
}))
