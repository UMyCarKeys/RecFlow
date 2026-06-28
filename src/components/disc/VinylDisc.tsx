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

  // Neutral flat normal base (#8080ff = no deflection)
  ctx.fillStyle = '#8080ff'
  ctx.fillRect(0, 0, size, size)

  // Alternating groove ridges and valleys with high enough contrast that
  // the normalScale can actually bend light between them. Low alpha here
  // produced near-invisible grooves under moderate normalScale values.
  for (let r = 38; r < size / 2 - 8; r += 3) {
    const isRidge = (r % 6) < 3
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    // Ridge normals lean toward viewer (brighter blue channel)
    // Valley normals lean away (darker, purple-shifted)
    ctx.strokeStyle = isRidge
      ? 'rgba(168, 168, 255, 0.45)'
      : 'rgba(52,  52,  195, 0.45)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
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
      {/* Main vinyl body — high metalness + high envMapIntensity means the
          surface acts like a mirror for the scene's colored lights; increasing
          normalScale makes the groove ridges visibly deflect that reflection */}
      <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1, 1, 0.04, 128]} />
        <meshStandardMaterial
          color="#0a080f"
          metalness={0.95}
          roughness={0.03}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(1.4, 1.4)}
          envMapIntensity={5.0}
        />
      </mesh>

      {/* Center label disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.021, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.001, 64]} />
        <meshStandardMaterial
          color={isActive ? '#7c6af0' : '#1c1c21'}
          roughness={0.35}
          metalness={0.15}
          envMapIntensity={1.0}
        />
      </mesh>

      {/* Spindle hole */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.06, 32]} />
        <meshStandardMaterial color="#000000" roughness={1} metalness={0} />
      </mesh>

      {/* Active glow ring */}
      {isActive && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
          <ringGeometry args={[1.01, 1.06, 128]} />
          <meshStandardMaterial
            color="#7c6af0"
            emissive="#7c6af0"
            emissiveIntensity={1.2}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </group>
  )
}
