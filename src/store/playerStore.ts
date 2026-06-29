import { create } from 'zustand'

export type LoadPhase = 'request' | 'download' | 'decode' | null

interface PlayerState {
  activeVersionId: string | null
  activeTrackTitle: string | null
  blobUrl: string | null
  isPlaying: boolean
  progress: number
  duration: number
  isLoading: boolean
  loadPhase: LoadPhase
  loadProgress: number // 0..1 (meaningful during 'download')
  startAt: number // seconds to seek to once loaded (for A/B compare)

  setActive: (versionId: string, trackTitle: string, startAt?: number) => void
  setBlobUrl: (url: string | null) => void
  setIsPlaying: (v: boolean) => void
  setProgress: (v: number) => void
  setDuration: (v: number) => void
  setLoading: (v: boolean) => void
  setLoad: (phase: LoadPhase, progress?: number) => void
  reset: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  activeVersionId: null,
  activeTrackTitle: null,
  blobUrl: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  isLoading: false,
  loadPhase: null,
  loadProgress: 0,
  startAt: 0,

  setActive: (versionId, trackTitle, startAt = 0) => {
    const prev = get().blobUrl
    if (prev) URL.revokeObjectURL(prev)
    set({
      activeVersionId: versionId,
      activeTrackTitle: trackTitle,
      blobUrl: null,
      isPlaying: false,
      progress: 0,
      duration: 0,
      isLoading: true,
      loadPhase: 'request',
      loadProgress: 0,
      startAt,
    })
  },
  // Blob is ready but WaveSurfer still needs to decode it.
  setBlobUrl: (url) => set({ blobUrl: url, loadPhase: url ? 'decode' : null }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setProgress: (v) => set({ progress: v }),
  setDuration: (v) => set({ duration: v }),
  setLoading: (v) => set({ isLoading: v, ...(v ? {} : { loadPhase: null, loadProgress: 0 }) }),
  setLoad: (phase, progress = 0) => set({ loadPhase: phase, loadProgress: progress, isLoading: phase !== null }),
  reset: () => {
    const prev = get().blobUrl
    if (prev) URL.revokeObjectURL(prev)
    set({
      activeVersionId: null,
      activeTrackTitle: null,
      blobUrl: null,
      isPlaying: false,
      progress: 0,
      duration: 0,
      isLoading: false,
      loadPhase: null,
      loadProgress: 0,
    })
  },
}))
