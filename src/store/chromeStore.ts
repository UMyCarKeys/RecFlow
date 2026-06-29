import { create } from 'zustand'

/**
 * Shared hover state for the app chrome (left rail + top bar). Lets the logo
 * brighten when either bar is hovered, so it feels meshed with both even though
 * they're separate elements.
 */
interface ChromeState {
  railHover: boolean
  barHover: boolean
  setRailHover: (v: boolean) => void
  setBarHover: (v: boolean) => void
}

export const useChromeStore = create<ChromeState>((set) => ({
  railHover: false,
  barHover: false,
  setRailHover: (railHover) => set({ railHover }),
  setBarHover: (barHover) => set({ barHover }),
}))
