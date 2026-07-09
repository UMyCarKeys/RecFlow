import { create } from 'zustand'

/**
 * Three moods for the whole app — DOM UI (via CSS variables keyed off
 * html[data-theme], see index.css + tailwind.config.js) and the 3D
 * environment (VinylScene reads THEME_SCENE for its backdrop shader palette,
 * light level and in-scene text color).
 *
 *  bright — the current warm airy look
 *  earth  — natural palette: bone light, mosses/terracotta, neon-leaf accent
 *  dark   — moody washed black, deep colors, faint washed accents
 */
export type ThemeName = 'bright' | 'earth' | 'dark'

export const THEMES: ThemeName[] = ['bright', 'earth', 'dark']

interface SceneTheme {
  /** fbm field colors, normalized RGB */
  base: [number, number, number]
  c1: [number, number, number] // warm primary (was coral)
  c2: [number, number, number] // secondary warm (was amber)
  c3: [number, number, number] // pink/moss slot (was rose)
  c4: [number, number, number] // cool slot (was violet)
  /** multiplier on scene light intensities */
  light: number
  /** color for 3D text (arc labels, empty hint) — must read on this backdrop */
  ink3d: string
}

export const THEME_SCENE: Record<ThemeName, SceneTheme> = {
  bright: {
    base: [0.965, 0.95, 0.955],
    c1: [1, 0.541, 0.42],
    c2: [1, 0.769, 0.42],
    c3: [1, 0.42, 0.616],
    c4: [0.722, 0.549, 1],
    light: 1,
    ink3d: '#6b6275',
  },
  earth: {
    base: [0.925, 0.912, 0.872],
    c1: [0.48, 0.56, 0.35], // moss
    c2: [0.82, 0.7, 0.36], // khaki gold
    c3: [0.76, 0.48, 0.31], // terracotta
    c4: [0.61, 0.8, 0.35], // neon leaf
    light: 0.95,
    ink3d: '#5c634a',
  },
  dark: {
    base: [0.075, 0.065, 0.095],
    c1: [0.42, 0.3, 0.36], // washed rose-brown
    c2: [0.45, 0.38, 0.28], // dim ember
    c3: [0.37, 0.32, 0.48], // washed violet
    c4: [0.25, 0.38, 0.42], // deep teal
    light: 0.5,
    ink3d: '#cfc7d6',
  },
}

const STORAGE_KEY = 'recflow-theme'

export function loadInitialTheme(): ThemeName {
  const t = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  return t === 'earth' || t === 'dark' ? t : 'bright'
}

interface ThemeState {
  theme: ThemeName
  /** bumps on every switch — ThemeFx keys its flicker animation off this */
  fxTick: number
  setTheme: (t: ThemeName) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: loadInitialTheme(),
  fxTick: 0,
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)
    set({ theme, fxTick: Date.now() })
  },
}))
