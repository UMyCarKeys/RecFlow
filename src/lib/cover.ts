/**
 * Deterministic generative artwork for a project's vinyl-sleeve cover.
 * Same project id always yields the same washed, grainy color/shape composition.
 */

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Warm Spectrum hues
const HUES = ['#ff8a6b', '#ffc46b', '#ff6b9d', '#b88cff', '#ff9e7d', '#ffd27d', '#f07a8f']

export type ShapeKind = 'circle' | 'tri' | 'bar'

export interface CoverShape {
  kind: ShapeKind
  x: number // %
  y: number // %
  size: number // px-ish (% of card)
  rot: number // deg
  color: string
  opacity: number
}

export interface CoverSpec {
  // three washed gradient blobs
  blobs: { color: string; x: number; y: number; spread: number; alpha: string }[]
  shapes: CoverShape[]
  discOffsetX: number // how far the record peeks from behind the sleeve (%)
  discTilt: number // deg
}

export function coverSpec(id: string): CoverSpec {
  const rnd = mulberry32(hashStr(id))
  const pick = () => HUES[Math.floor(rnd() * HUES.length)]
  const alphaHex = (a: number) =>
    Math.round(a * 255)
      .toString(16)
      .padStart(2, '0')

  const blobs = [
    { color: pick(), x: Math.round(rnd() * 100), y: Math.round(rnd() * 100), spread: 50 + Math.round(rnd() * 15), alpha: alphaHex(0.85) },
    { color: pick(), x: Math.round(rnd() * 100), y: Math.round(rnd() * 100), spread: 55 + Math.round(rnd() * 15), alpha: alphaHex(0.7) },
    { color: pick(), x: Math.round(rnd() * 100), y: Math.round(rnd() * 100), spread: 60 + Math.round(rnd() * 15), alpha: alphaHex(0.6) },
  ]

  const shapeCount = 3 + Math.floor(rnd() * 3)
  const kinds: ShapeKind[] = ['circle', 'tri', 'bar']
  const shapes: CoverShape[] = Array.from({ length: shapeCount }, () => ({
    kind: kinds[Math.floor(rnd() * kinds.length)],
    x: Math.round(rnd() * 100),
    y: Math.round(rnd() * 100),
    size: 22 + Math.round(rnd() * 40),
    rot: Math.round(rnd() * 360),
    color: pick(),
    opacity: 0.12 + rnd() * 0.18,
  }))

  return {
    blobs,
    shapes,
    discOffsetX: 56 + Math.round(rnd() * 22),
    discTilt: Math.round(rnd() * 30 - 15),
  }
}
