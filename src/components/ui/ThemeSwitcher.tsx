import { useEffect, useRef, useState } from 'react'
import { useThemeStore, THEMES, type ThemeName } from '@/store/themeStore'

const LABEL: Record<ThemeName, string> = { bright: 'Bright', earth: 'Earth', dark: 'Dark' }
// Swatch dots shown in the menu — literal colors on purpose (they preview the
// OTHER themes, so they can't come from the current theme's variables).
const SWATCH: Record<ThemeName, string> = {
  bright: 'linear-gradient(135deg, #ffc46b, #ff8a6b)',
  earth: 'linear-gradient(135deg, #7a8f5a, #9ccb3b)',
  dark: 'linear-gradient(135deg, #1a1622, #4a3f55)',
}

/**
 * The mood switch: three themes, presented like a light switch. Switching
 * plays a quick lights-flicker overlay (ThemeFx) with a soft double click —
 * the room's lights being changed — while every CSS variable and the 3D
 * backdrop palette swap underneath it.
 */
export function ThemeSwitcher() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const pick = (t: ThemeName) => {
    setOpen(false)
    if (t === theme) return
    switchClick()
    setTheme(t)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Mood / color scheme"
        className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-line/[0.05] transition-colors"
      >
        <BulbIcon />
      </button>
      {open && (
        <div data-ui-overlay className="absolute right-0 mt-2 w-40 rounded-xl glass-light border border-line/[0.08] shadow-xl p-1.5 z-50">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => pick(t)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                t === theme ? 'text-ink bg-line/[0.06]' : 'text-muted hover:text-ink hover:bg-line/[0.05]'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full border border-line/20 flex-shrink-0" style={{ background: SWATCH[t] }} />
              {LABEL[t]}
              {t === theme && <span className="ml-auto text-[10px] text-faint">on</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Full-screen overlay that plays the lights-flicker when the theme changes. */
export function ThemeFx() {
  const fxTick = useThemeStore((s) => s.fxTick)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!fxTick) return
    setPlaying(true)
    const t = setTimeout(() => setPlaying(false), 600)
    return () => clearTimeout(t)
  }, [fxTick])
  if (!playing) return null
  return (
    <div
      aria-hidden
      className="theme-fx-flicker"
      style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 95, pointerEvents: 'none' }}
    />
  )
}

// A soft double "click-clack", synthesized — no audio asset, no network.
// Runs inside the user's click gesture, so autoplay policy allows it.
function switchClick() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const t0 = ctx.currentTime
    const tick = (at: number, freq: number, gain: number) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'square'
      o.frequency.value = freq
      g.gain.setValueAtTime(gain, at)
      g.gain.exponentialRampToValueAtTime(0.0004, at + 0.035)
      o.connect(g)
      g.connect(ctx.destination)
      o.start(at)
      o.stop(at + 0.05)
    }
    tick(t0, 2400, 0.08) // off…
    tick(t0 + 0.11, 1700, 0.06) // …on
    window.setTimeout(() => void ctx.close(), 500)
  } catch {
    /* audio is a garnish — never let it break the switch */
  }
}

function BulbIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
      <path d="M8 1.5a4.2 4.2 0 0 0-2.4 7.65c.55.4.9 1 .9 1.65v.2h3v-.2c0-.65.35-1.25.9-1.65A4.2 4.2 0 0 0 8 1.5z" />
      <path d="M6.7 13h2.6" />
      <path d="M7.2 14.5h1.6" />
    </svg>
  )
}
