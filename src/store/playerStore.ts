import { create } from 'zustand'

interface PlayerState {
  activeVersionId: string | null
  activeTrackTitle: string | null
  blobUrl: string | null
  isPlaying: boolean
  progress: number
  duration: number
  isLoading: boolean

  setActive: (versionId: string, trackTitle: string) => void
  setBlobUrl: (url: string | null) => void
  setIsPlaying: (v: boolean) => void
  setProgress: (v: number) => void
  setDuration: (v: number) => void
  setLoading: (v: boolean) => void
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

  setActive: (versionId, trackTitle) => {
    const prev = get().blobUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ activeVersionId: versionId, activeTrackTitle: trackTitle, blobUrl: null, isPlaying: false, progress: 0, duration: 0, isLoading: true })
  },
  setBlobUrl: (url) => set({ blobUrl: url, isLoading: false }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setProgress: (v) => set({ progress: v }),
  setDuration: (v) => set({ duration: v }),
  setLoading: (v) => set({ isLoading: v }),
  reset: () => {
    const prev = get().blobUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ activeVersionId: null, activeTrackTitle: null, blobUrl: null, isPlaying: false, progress: 0, duration: 0, isLoading: false })
  },
}))
