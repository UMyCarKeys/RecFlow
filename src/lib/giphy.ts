const KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined

export interface GifResult {
  id: string
  preview: string // small looping preview for the grid
  mp4: string // original mp4 (for 0.9x slowed playback)
  gif: string // original gif fallback
  title: string
}

export const giphyConfigured = () => !!KEY

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
  if (!KEY) return []
  const endpoint = query.trim()
    ? `https://api.giphy.com/v1/gifs/search?api_key=${KEY}&q=${encodeURIComponent(query)}&limit=18&rating=pg-13&bundle=messaging_non_clips`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${KEY}&limit=18&rating=pg-13`
  const res = await fetch(endpoint)
  if (!res.ok) return []
  const json = await res.json()
  return mapResults((json.data as GiphyItem[]) ?? [])
}
