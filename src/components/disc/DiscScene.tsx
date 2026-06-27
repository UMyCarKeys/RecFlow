import { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import { VinylDisc } from './VinylDisc'
import { usePlayerStore } from '@/store/playerStore'
import type { Version, Track } from '@/types/database'

interface DiscSceneProps {
  tracks: Track[]
  latestVersions: Record<string, Version>
  onDiscClick: (version: Version | null, track: Track) => void
}

const SPACING = 2.8
const BASE_POS = new THREE.Vector3(0, 1.75, 5)
const SENSITIVITY = 0.6

function CameraRig() {
  const { camera, gl } = useThree()
  const mouseNorm = useRef({ x: 0, y: 0 })
  const target = useRef(new THREE.Vector3().copy(BASE_POS))

  useEffect(() => {
    const canvas = gl.domElement

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseNorm.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseNorm.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    const onLeave = () => {
      mouseNorm.current.x = 0
      mouseNorm.current.y = 0
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [gl.domElement])

  useFrame(() => {
    target.current.set(
      BASE_POS.x + mouseNorm.current.x * SENSITIVITY,
      BASE_POS.y + mouseNorm.current.y * SENSITIVITY * 0.3,
      BASE_POS.z,
    )
    camera.position.lerp(target.current, 0.05)
    camera.lookAt(0, 0, 0)
  })

  return null
}

export function DiscScene({ tracks, latestVersions, onDiscClick }: DiscSceneProps) {
  const setActive = usePlayerStore((s) => s.setActive)
  const COLS = Math.min(tracks.length, 4)

  const handleClick = (track: Track) => {
    const version = latestVersions[track.id] ?? null
    if (version) setActive(version.id, track.title)
    onDiscClick(version, track)
  }

  return (
    <Canvas
      camera={{ fov: 45, position: [0, 1.75, 5] }}
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

      <CameraRig />
    </Canvas>
  )
}
