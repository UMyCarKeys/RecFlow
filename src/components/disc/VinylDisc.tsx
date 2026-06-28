import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
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

  // Neutral base — (128, 128, 255) means "no deflection from surface normal"
  ctx.fillStyle = '#8080ff'
  ctx.fillRect(0, 0, size, size)

  // Alternating ridge / valley rings starting close to center so the entire
  // playing surface has groove detail, not just the outer edge.
  // Higher alpha (0.5) and genuine contrast between ridge and valley values
  // are what actually bend the reflected light between grooves.
  for (let r = 18; r < size / 2 - 4; r += 3) {
    const isRidge = (r % 6) < 3
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = isRidge
      ? 'rgba(172, 172, 255, 0.5)'   // ridge: normal leans toward viewer
      : 'rgba(44,  44,  188, 0.5)'   // valley: normal leans away
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  return new THREE.CanvasTexture(canvas)
}

export function VinylDisc({ versionId, position, onClick }: VinylDiscProps) {
  const spinRef = useRef<THREE.Group>(null)
  const { activeVersionId, isPlaying } = usePlayerStore()
  const isActive = activeVersionId === versionId
  const normalMap = useMemo(() => makeGrooveNormalMap(), [])

  useFrame((_, delta) => {
    if (!spinRef.current) return
    if (isActive && isPlaying) {
      // Rotate around Z — the disc's normal axis — so it spins flat like a record
      spinRef.current.rotation.z += RPM_RAD_PER_SEC * delta
    }
  })

  return (
    <group position={position} onClick={onClick}>

      {/* All disc geometry lives in this spinning group */}
      <group ref={spinRef}>

        {/* Front playing surface — CircleGeometry gives correct flat UV layout
            and proper tangent vectors so the normal map actually deflects
            reflections across the full face, not just the outer rim */}
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[1, 128]} />
          <meshStandardMaterial
            color="#0a080f"
            metalness={0.95}
            roughness={0.03}
            normalMap={normalMap}
            normalScale={new THREE.Vector2(1.4, 1.4)}
            envMapIntensity={5.0}
          />
        </mesh>

        {/* Back face */}
        <mesh rotation={[0, Math.PI, 0]} position={[0, 0, -0.02]}>
          <circleGeometry args={[1, 64]} />
          <meshStandardMaterial color="#0a080f" metalness={0.85} roughness={0.08} />
        </mesh>

        {/* Thin edge rim connecting the two faces */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1, 1, 0.04, 128, 1, true]} />
          <meshStandardMaterial color="#0a080f" metalness={0.95} roughness={0.04} envMapIntensity={3.0} />
        </mesh>

        {/* Center label */}
        <mesh position={[0, 0, 0.022]}>
          <circleGeometry args={[0.28, 64]} />
          <meshStandardMaterial
            color={isActive ? '#7c6af0' : '#1c1c21'}
            roughness={0.35}
            metalness={0.15}
            envMapIntensity={1.0}
          />
        </mesh>

        {/* Spindle hole */}
        <mesh position={[0, 0, 0.023]}>
          <circleGeometry args={[0.04, 32]} />
          <meshStandardMaterial color="#000000" roughness={1} metalness={0} />
        </mesh>

      </group>

      {/* Glow ring sits outside the spinning group so it stays still */}
      {isActive && (
        <mesh position={[0, 0, 0.025]}>
          <ringGeometry args={[1.01, 1.06, 128]} />
          <meshStandardMaterial
            color="#7c6af0"
            emissive="#7c6af0"
            emissiveIntensity={1.2}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

    </group>
  )
}
