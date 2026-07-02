import { create } from 'zustand'

/** Minimal track shape the vinyl needs to draw a groove strip. */
export interface SceneTrack {
  id: string
  title: string
  stage: string
}

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
  /**
   * Cover art URL of the project currently shown as a record. VinylScene lives
   * in AppShell (away from the page's project data), so pages publish the cover
   * here for the vinyl's center label. null = no cover (show fallback).
   */
  coverUrl: string | null
  setCoverUrl: (url: string | null) => void
  /**
   * Project id used as the seed for the dashboard's generated cover art. When
   * there's no uploaded coverUrl, the vinyl center reproduces that same
   * generated artwork from this seed.
   */
  coverSeed: string | null
  setCoverSeed: (seed: string | null) => void
  /** Tracks of the current project, drawn as glowing groove strips on the vinyl. */
  tracks: SceneTrack[]
  setTracks: (tracks: SceneTrack[]) => void
  /** Which track strip is hovered (drives the glow + caption). */
  hoveredTrackId: string | null
  setHoveredTrackId: (id: string | null) => void
  /** Page-supplied handler run when a track strip is clicked (drill into track). */
  onSelectTrack: ((id: string) => void) | null
  setOnSelectTrack: (fn: ((id: string) => void) | null) => void
}

export const useDepthStore = create<DepthState>((set) => ({
  depth: 0,
  setDepth: (depth) => set({ depth }),
  coverUrl: null,
  setCoverUrl: (coverUrl) => set({ coverUrl }),
  coverSeed: null,
  setCoverSeed: (coverSeed) => set({ coverSeed }),
  tracks: [],
  setTracks: (tracks) => set({ tracks }),
  hoveredTrackId: null,
  setHoveredTrackId: (hoveredTrackId) => set({ hoveredTrackId }),
  onSelectTrack: null,
  setOnSelectTrack: (onSelectTrack) => set({ onSelectTrack }),
}))
