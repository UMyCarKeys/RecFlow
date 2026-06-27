import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { usePlayerStore } from '@/store/playerStore'
import { fetchAudioBlob } from '@/lib/r2'

export function AudioPlayer() {
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { activeVersionId, blobUrl, isPlaying, setBlobUrl, setIsPlaying, setProgress, setDuration } = usePlayerStore()

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
    ws.on('ready', (d) => setDuration(d))
    ws.on('play', () => setIsPlaying(true))
    ws.on('pause', () => setIsPlaying(false))
    ws.on('finish', () => setIsPlaying(false))

    wavesurferRef.current = ws
    return () => ws.destroy()
  }, [setDuration, setIsPlaying, setProgress])

  // Load blob URL when it changes
  useEffect(() => {
    if (!blobUrl || !wavesurferRef.current) return
    wavesurferRef.current.load(blobUrl).then(() => {
      // Revoke after wavesurfer has decoded into Web Audio buffers
      URL.revokeObjectURL(blobUrl)
      wavesurferRef.current?.play()
    })
  }, [blobUrl])

  // Fetch blob when active version changes
  useEffect(() => {
    if (!activeVersionId) return
    fetchAudioBlob(activeVersionId).then(setBlobUrl).catch(console.error)
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
      className="flex-1 mx-4"
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}
