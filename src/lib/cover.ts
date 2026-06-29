/**
 * Deterministic generative artwork for a project's vinyl-sleeve cover.
 * Same project id always yields the same composition: smooth washed gradient
 * blobs (no hard edges) plus a few randomized technical "print marks" in the
 * corners, in the spirit of a screen-printed record sleeve.
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

export type MarkId =
  | 'barcode'
  | 'ce'
  | 'fcc'
  | 'ccc'
  | 'e9'
  | 'hazard'
  | 'caution'
  | 'reg'
  | 'globe'
  | 'colorbars'
  | 'stereo'
  | 'seihin'
  | 'code'
  | 'sizes'
  | 'iospec'
  | 'prohibit'
  | 'copyright'
  | 'halftone'
  | 'download'
  | 'stereoArrows'
  | 'stereoOutline'
  | 'stereoItalic'
  | 'stereoBoxed'
  | 'stereoSerif'
  | 'stereoClef'
  | 'flower'
  | 'asterisk'
  | 'nestedSquares'
  | 'concentric'
  | 'chevrons'
  | 'grid'

export type Corner = 'tl' | 'tr' | 'bl' | 'br'

export interface CoverMark {
  id: MarkId
  corner: Corner
  rot: number
  scale: number
  color: string
}

export interface CoverBlob {
  color: string
  x: number
  y: number
  spread: number
  alpha: string
}

export interface CoverSpec {
  blobs: CoverBlob[]
  sweep: string // a soft diagonal gradient sweep color
  sweepAngle: number
  marks: CoverMark[]
  code: string
  discTilt: number
}

// The many vintage "STEREO" wordmark treatments from the reference sheet
const STEREO_VARIANTS: MarkId[] = [
  'stereo', 'stereoArrows', 'stereoOutline', 'stereoItalic', 'stereoBoxed', 'stereoSerif', 'stereoClef',
]
// Everything else: compliance marks, geometry, barcodes, print symbols
const OTHER_MARKS: MarkId[] = [
  'barcode', 'ce', 'fcc', 'ccc', 'e9', 'hazard', 'caution', 'reg', 'globe',
  'colorbars', 'seihin', 'code', 'sizes', 'iospec', 'prohibit', 'copyright',
  'halftone', 'download', 'flower', 'asterisk', 'nestedSquares', 'concentric',
  'chevrons', 'grid',
]
const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br']
const CODE_LETTERS = 'ABCDEFGHJKLMNPRSTUVXZ'
const INK = '#f4ece8'

export function coverSpec(id: string): CoverSpec {
  const rnd = mulberry32(hashStr(id))
  const pick = () => HUES[Math.floor(rnd() * HUES.length)]
  const alphaHex = (a: number) =>
    Math.round(a * 255)
      .toString(16)
      .padStart(2, '0')

  // Smooth, feathered gradient blobs (no hard edges)
  const blobs: CoverBlob[] = Array.from({ length: 5 }, (_, i) => ({
    color: pick(),
    x: Math.round(rnd() * 100),
    y: Math.round(rnd() * 100),
    spread: 48 + Math.round(rnd() * 22),
    alpha: alphaHex(0.85 - i * 0.1),
  }))

  // Seeded catalog code, e.g. "LR-05592"
  const code =
    CODE_LETTERS[Math.floor(rnd() * CODE_LETTERS.length)] +
    CODE_LETTERS[Math.floor(rnd() * CODE_LETTERS.length)] +
    '-' +
    String(10000 + Math.floor(rnd() * 89999))

  // Palette of the cover's own colors, used to tint some marks
  const palette = Array.from(new Set(blobs.map((b) => b.color)))
  const markColor = () => (rnd() < 0.45 ? INK : palette[Math.floor(rnd() * palette.length)])

  const shuffle = <T,>(arr: T[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  // Always seed at least one vintage STEREO mark, then fill with other symbols.
  const stereoPool = shuffle([...STEREO_VARIANTS])
  const otherPool = shuffle([...OTHER_MARKS])
  const corners = shuffle([...CORNERS])

  const count = 3 + Math.floor(rnd() * 2) // 3..4
  const stereoCount = rnd() < 0.4 ? 2 : 1
  const ids: MarkId[] = []
  for (let i = 0; i < stereoCount && ids.length < count; i++) ids.push(stereoPool[i])
  let oi = 0
  while (ids.length < count && oi < otherPool.length) ids.push(otherPool[oi++])
  shuffle(ids)

  const marks: CoverMark[] = ids.map((id, i) => ({
    id,
    corner: corners[i % corners.length],
    rot: Math.round(rnd() * 16 - 8),
    scale: 0.85 + rnd() * 0.3,
    color: markColor(),
  }))

  return {
    blobs,
    sweep: pick(),
    sweepAngle: Math.round(rnd() * 360),
    marks,
    code,
    discTilt: Math.round(rnd() * 30 - 15),
  }
}
