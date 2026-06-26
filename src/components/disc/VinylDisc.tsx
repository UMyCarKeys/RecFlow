import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh } from 'three'
import { usePlayerStore } from '@/store/playerStore'

interface VinylDiscProps {
  versionId: string
  trackTitle: string
  position: [number, number, number]
  onClick: () => void
}

const RPM_RAD_PER_SEC = (33.33 / 60) * Math.PI * 2

function makeGrooveNormalMap(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2

  ctx.fillStyle = '#8080ff'
  ctx.fillRect(0, 0, size, size)

  // Draw concentric groove rings as subtle normal variations
  for (let r = 40; r < size / 2 - 10; r += 4) {
    const alpha = 0.06 + (Math.random() * 0.04)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(100, 100, 255, ${alpha})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  return new THREE.CanvasTexture(canvas)
}

export function VinylDisc({ versionId, position, onClick }: VinylDiscProps) {
  const meshRef = useRef<Mesh>(null)
  const { activeVersionId, isPlaying } = usePlayerStore()
  const isActive = activeVersionId === versionId

  const normalMap = useMemo(() => makeGrooveNormalMap(), [])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    if (isActive && isPlaying) {
      meshRef.current.rotation.y += RPM_RAD_PER_SEC * delta
    }
  })

  return (
    <group position={position} onClick={onClick}>
      {/* Main vinyl body */}
      <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1, 1, 0.04, 128]} />
        <meshStandardMaterial
          color="#0d0d12"
          metalness={0.9}
          roughness={0.05}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.3, 0.3)}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Center label disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.021, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.001, 64]} />
        <meshStandardMaterial
          color={isActive ? '#7c6af0' : '#1c1c21'}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Spindle hole */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.06, 32]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Active glow ring */}
      {isActive && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
          <ringGeometry args={[1.01, 1.06, 128]} />
          <meshStandardMaterial
            color="#7c6af0"
            emissive="#7c6af0"
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  )
}
