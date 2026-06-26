import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import { VinylDisc } from './VinylDisc'
import { usePlayerStore } from '@/store/playerStore'
import type { Version, Track } from '@/types/database'

interface DiscSceneProps {
  tracks: Track[]
  latestVersions: Record<string, Version>
  onDiscClick: (version: Version, track: Track) => void
}

const COLS = 4
const SPACING = 2.8

export function DiscScene({ tracks, latestVersions, onDiscClick }: DiscSceneProps) {
  const setActive = usePlayerStore((s) => s.setActive)

  const handleClick = (track: Track) => {
    const version = latestVersions[track.id]
    if (!version) return
    setActive(version.id, track.title)
    onDiscClick(version, track)
  }

  return (
    <Canvas
      camera={{ fov: 45, position: [0, 3.5, 10] }}
      className="w-full h-full"
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 8, 5]} intensity={0.6} castShadow />
      <pointLight position={[-4, 3, 2]} intensity={0.4} color="#7c6af0" />

      <Suspense fallback={null}>
        <Environment preset="studio" />

        {tracks.map((track, i) => {
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const x = (col - (COLS - 1) / 2) * SPACING
          const z = -row * SPACING

          return (
            <VinylDisc
              key={track.id}
              versionId={latestVersions[track.id]?.id ?? ''}
              trackTitle={track.title}
              position={[x, 0, z]}
              onClick={() => handleClick(track)}
            />
          )
        })}
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 4}
      />
    </Canvas>
  )
}
