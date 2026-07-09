// One or two keys (a primary + optional fallback). Free Giphy keys are
// rate-limited per key, so with several concurrent users the primary can hit
// 429/403 and return nothing; the fallback key lets the request retry.
// NOTE: these are VITE_ (build-time) vars — they must be set in the DEPLOY
// build environment (Cloudflare Pages → Settings → Environment variables),
// not only in local .env, or the deployed site ships with no key.
const KEYS = [
  import.meta.env.VITE_GIPHY_API_KEY,
  import.meta.env.VITE_GIPHY_API_KEY_2,
].filter((k): k is string => typeof k === 'string' && k.length > 0)

export interface GifResult {
  id: string
  preview: string // small looping preview for the grid
  mp4: string // original mp4 (for 0.9x slowed playback)
  gif: string // original gif fallback
  title: string
}

export const giphyConfigured = () => KEYS.length > 0

interface GiphyImage {
  url?: string
  mp4?: string
}
interface GiphyItem {
  id: string
  title?: string
  images?: {
    fixed_width?: GiphyImage
    original?: GiphyImage
  }
}

function mapResults(items: GiphyItem[]): GifResult[] {
  return items.map((g) => ({
    id: g.id,
    preview: g.images?.fixed_width?.url ?? g.images?.original?.url ?? '',
    mp4: g.images?.original?.mp4 ?? '',
    gif: g.images?.original?.url ?? '',
    title: g.title ?? '',
  }))
}

export async function searchGifs(query: string): Promise<GifResult[]> {
  const q = query.trim()
  for (const key of KEYS) {
    const endpoint = q
      ? `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=18&rating=pg-13&bundle=messaging_non_clips`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=18&rating=pg-13`
    let res: Response
    try {
      res = await fetch(endpoint)
    } catch {
      continue // network error — try the next key
    }
    if (res.ok) {
      const json = await res.json()
      return mapResults((json.data as GiphyItem[]) ?? [])
    }
    // Rate limit / quota → fall through to the next key; any other error is
    // not key-specific, so stop.
    if (res.status !== 429 && res.status !== 403) break
  }
  return []
}
