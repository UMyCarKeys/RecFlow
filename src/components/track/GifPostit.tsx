import { useEffect, useRef } from 'react'

interface GifPostitProps {
  url: string
  canEdit: boolean
  onChange: () => void
  onRemove: () => void
}

/**
 * A playful sticky-note GIF pinned to a track. mp4 sources loop at 0.9x speed;
 * gif sources just loop. Slightly rotated like a real post-it.
 */
export function GifPostit({ url, canEdit, onChange, onRemove }: GifPostitProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isVideo = url.toLowerCase().includes('.mp4')

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.9
  }, [url])

  return (
    <div className="group/postit relative inline-block -rotate-2 hover:rotate-0 transition-transform duration-300">
      <div className="p-1.5 bg-[#f4ece8] rounded-[3px] shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
        <div className="w-36 h-36 rounded-[2px] overflow-hidden bg-black">
          {isVideo ? (
            <video ref={videoRef} src={url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      </div>
      {/* tape */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-white/20 rotate-[4deg] rounded-[1px]" />

      {canEdit && (
        <div className="absolute -bottom-2 -right-2 flex gap-1 opacity-0 group-hover/postit:opacity-100 transition-opacity">
          <button onClick={onChange} className="w-6 h-6 rounded-full bg-surface-3 border border-white/15 text-xs text-white/80 hover:text-white" title="Change GIF">
            ↻
          </button>
          <button onClick={onRemove} className="w-6 h-6 rounded-full bg-surface-3 border border-white/15 text-xs text-white/80 hover:text-red-400" title="Remove GIF">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
