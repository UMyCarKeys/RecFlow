import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { searchGifs, giphyConfigured, type GifResult } from '@/lib/giphy'

interface GifPickerProps {
  open: boolean
  onClose: () => void
  onPick: (url: string) => void
}

export function GifPicker({ open, onClose, onPick }: GifPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GifResult[]>([])
  const [loading, setLoading] = useState(false)

  // Debounced search; loads trending when query is empty
  useEffect(() => {
    if (!open || !giphyConfigured()) return
    setLoading(true)
    const t = setTimeout(async () => {
      const r = await searchGifs(query)
      setResults(r)
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query, open])

  const pick = (g: GifResult) => {
    onPick(g.mp4 || g.gif)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a GIF">
      {!giphyConfigured() ? (
        <p className="text-sm text-muted leading-relaxed">
          GIF search isn't configured yet. Add a free Giphy API key as
          <span className="text-white font-mono"> VITE_GIPHY_API_KEY</span> and redeploy to enable it.
        </p>
      ) : (
        <div className="space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs…"
            autoFocus
            className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
          />
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted py-6 text-center">No GIFs found.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto no-scrollbar">
              {results.map((g) => (
                <button
                  key={g.id}
                  onClick={() => pick(g)}
                  className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-accent transition-colors"
                >
                  <img src={g.preview} alt={g.title} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted/60 text-center">Powered by GIPHY</p>
        </div>
      )}
    </Modal>
  )
}
