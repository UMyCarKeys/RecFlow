import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { usePlayerStore } from '@/store/playerStore'
import { fetchAudioBlob } from '@/lib/r2'

export function AudioPlayer() {
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { activeVersionId, blobUrl, isPlaying, setBlobUrl, setIsPlaying, setProgress, setDuration, setLoading, setLoad } = usePlayerStore()

  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(124, 106, 240, 0.4)',
      progressColor: '#7c6af0',
      cursorColor: '#9b8ef5',
      height: 40,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      interact: true,
      backend: 'WebAudio',
    })

    ws.on('timeupdate', (t) => setProgress(t))
    ws.on('ready', (d) => {
      setDuration(d)
      setLoading(false) // decode finished — clear the loading status
    })
    ws.on('play', () => setIsPlaying(true))
    // Capture the exact position when paused, so a pinned comment uses the
    // paused time rather than defaulting back to 0:00.
    ws.on('pause', () => {
      setIsPlaying(false)
      setProgress(ws.getCurrentTime())
    })
    ws.on('finish', () => setIsPlaying(false))
    // Keep progress in sync while scrubbing/seeking (even when paused).
    ws.on('seeking', (t) => setProgress(t))
    ws.on('interaction', (t) => setProgress(t))

    wavesurferRef.current = ws
    return () => ws.destroy()
  }, [setDuration, setIsPlaying, setProgress])

  // Load blob URL when it changes
  useEffect(() => {
    if (!blobUrl || !wavesurferRef.current) return
    const ws = wavesurferRef.current
    ws.load(blobUrl).then(() => {
      // Revoke after wavesurfer has decoded into Web Audio buffers
      URL.revokeObjectURL(blobUrl)
      // A/B compare: resume at the same position when switching lines
      const startAt = usePlayerStore.getState().startAt
      if (startAt > 0) ws.setTime(startAt)
      ws.play()
    })
  }, [blobUrl])

  // Fetch blob when active version changes
  useEffect(() => {
    if (!activeVersionId) return
    fetchAudioBlob(activeVersionId, (phase, p) => setLoad(phase, p))
      .then(setBlobUrl)
      .catch((err) => {
        console.error('[AudioPlayer] fetch failed:', err)
        setLoading(false)
      })
  }, [activeVersionId, setBlobUrl])

  // Sync external play/pause commands
  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws) return
    if (isPlaying && !ws.isPlaying()) ws.play()
    else if (!isPlaying && ws.isPlaying()) ws.pause()
  }, [isPlaying])

  return (
    <div
      id="audio-player-waveform"
      ref={containerRef}
      className="w-full"
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}
