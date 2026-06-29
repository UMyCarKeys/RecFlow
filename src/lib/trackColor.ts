// Deterministic per-track accent hue, so each track's ring/groove color is stable.
const HUES = ['#ff8a6b', '#ffc46b', '#ff6b9d', '#b88cff', '#6fd6c4', '#ff9e7d', '#f07a8f', '#ffd27d']

export function trackHue(id: string): string {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return HUES[(h >>> 0) % HUES.length]
}
