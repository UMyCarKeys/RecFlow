import { useRef, useMemo, useEffect, useCallback, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MeshTransmissionMaterial, OrbitControls, Environment } from '@react-three/drei'
import { getProject, types } from '@theatre/core'
import { useControls, button, Leva } from 'leva'
import * as THREE from 'three'
import { useDepthStore } from '@/store/depthStore'
import { STAGE_VALUE, STAGE_LABEL } from '@/lib/progress'
import { trackHue } from '@/lib/trackColor'

/**
 * VinylScene — Path A frosted-glass vinyl, wired for in-browser authoring.
 *
 * A separate R3F canvas that sits OVER the page. Inside it we render a backdrop
 * plane running the SAME fbm color-field shader as DepthBackground, so the
 * transmissive vinyl refracts a copy of the real background.
 *
 * Editing (dev only):
 *   - Theatre.js Studio (top-right panel + timeline) keyframes the disc & camera
 *     "stage" transforms into looping sequences. Studio is loaded via dynamic
 *     import so it is NOT bundled into production.
 *   - Leva (left panel) drives the frost/material props and the continuous
 *     loop speeds live.
 *
 * The nesting is: stage group (Theatre, keyframeable) > float group (loop) >
 * spin group (loop) > meshes — so the continuous loops never fight the
 * keyframed stages.
 */

// ---- Theatre.js: project + sheet (module scope so they're created once) ------
// To bake edited values into production later: export the state from Studio and
// pass it here → getProject('RecFlow Vinyl', { state: theatreState }).
const sheet = getProject('RecFlow Vinyl').sheet('VinylScene')

// Studio is the editor UI. Dev-only + dynamically imported so it never ships to
// production. The window flag guards against HMR / StrictMode double-init.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const w = window as unknown as { __theatreStudioInit?: boolean }
  if (!w.__theatreStudioInit) {
    w.__theatreStudioInit = true
    import('@theatre/studio')
      .then((mod) => {
        // Vite's dep pre-bundling can double-wrap the default export, so dig for
        // the object that actually has initialize().
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const m = mod as any
        const studio = typeof m.default?.initialize === 'function' ? m.default : m.default?.default ?? m
        studio.initialize?.()
        /* eslint-enable @typescript-eslint/no-explicit-any */
      })
      .catch(() => {})
  }
}

// ---- the SAME fragment shader as DepthBackground, as an in-scene backdrop ----
const BACKDROP_FRAG = /* glsl */ `
precision highp float;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_depth;
uniform float u_sat;
uniform float u_contrast;
varying vec2 vUv;

float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.; a*=.5; } return v; }

void main(){
  vec2 uv = vUv;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = uv; p.x *= aspect;
  float zoom = 1.0 - u_depth * 0.26;
  vec2 center = 0.5 * vec2(aspect, 1.0);
  p = (p - center) * zoom + center;
  float t = u_time * 0.075;
  vec2 mouseOff = u_mouse * 0.2;
  vec2 q = vec2(fbm(p+vec2(0.,t)+mouseOff), fbm(p+vec2(5.2,-t)+mouseOff));
  vec2 r = vec2(fbm(p+2.*q+vec2(1.7,9.2)+t*.5), fbm(p+2.*q+vec2(8.3,2.8)-t*.5));
  float f = fbm(p+2.5*r);
  vec3 base=vec3(.965,.95,.955);
  vec3 coral=vec3(1.,.541,.42), amber=vec3(1.,.769,.42), rose=vec3(1.,.42,.616), violet=vec3(.722,.549,1.);
  vec3 col=base;
  col=mix(col,rose,  smoothstep(0.,.85,f)*.55);
  col=mix(col,coral, smoothstep(.15,1.,r.x)*.55);
  col=mix(col,amber, smoothstep(.25,1.,q.y)*.48);
  col=mix(col,violet,smoothstep(.35,1.,r.y)*.5);
  col=mix(base,col,smoothstep(0.,.8,f+.25));
  float lum=dot(col,vec3(.299,.587,.114));
  col=mix(vec3(lum),col,u_sat);
  col=(col-0.5)*u_contrast+0.5; // push contrast so the glass has something to refract
  col=clamp(col,0.,1.);
  gl_FragColor=vec4(col,1.0);
}
`

const BACKDROP_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`

// Backdrop plane: fills the view behind the vinyl, runs the page's color field.
// Locked to the camera each frame so it always covers the current view frame at
// any angle (rather than being a fixed plane that only fills a straight-on shot).
function Backdrop() {
  const mat = useRef<THREE.ShaderMaterial>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const { size, pointer, camera } = useThree()
  // Saturation knob: the page palette is near-white, so raise this to make the
  // colored "lights" read through the transmissive disc.
  // Defaults match the page's DepthBackground (saturation 1.45, no extra
  // contrast) so the glass reads the same brightness as the surrounding page.
  const bg = useControls('Backdrop', {
    saturation: { value: 1.45, min: 0, max: 5, step: 0.1 },
    contrast: { value: 1.0, min: 0.5, max: 4, step: 0.1 },
  })
  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(size.width, size.height) },
      u_mouse: { value: new THREE.Vector2(0, 0) },
      u_depth: { value: useDepthStore.getState().depth },
      u_sat: { value: 1.45 },
      u_contrast: { value: 1.0 },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useFrame((state) => {
    uniforms.u_time.value = state.clock.elapsedTime
    uniforms.u_resolution.value.set(size.width, size.height)
    uniforms.u_mouse.value.lerp(new THREE.Vector2(pointer.x, pointer.y), 0.06)
    uniforms.u_depth.value = useDepthStore.getState().depth
    uniforms.u_sat.value = bg.saturation
    uniforms.u_contrast.value = bg.contrast

    // Lock the plane a fixed distance in front of the camera, facing it, scaled
    // to exactly fill the frustum — so it covers the frame at any camera angle.
    const cam = camera as THREE.PerspectiveCamera
    const dist = 12
    meshRef.current.position.copy(cam.position)
    meshRef.current.quaternion.copy(cam.quaternion)
    meshRef.current.translateZ(-dist)
    const h = 2 * Math.tan((cam.fov * Math.PI) / 360) * dist
    meshRef.current.scale.set(h * (size.width / size.height), h, 1)
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={BACKDROP_VERT}
        fragmentShader={BACKDROP_FRAG}
        uniforms={uniforms}
      />
    </mesh>
  )
}

// Camera rig: bind the camera's position + look-at to a Theatre object so the
// fly-in / framing can be keyframed as a stage.
function CameraRig() {
  const cam = useThree((s) => s.camera)
  const obj = useMemo(
    () =>
      sheet.object(
        'Camera',
        {
          // Track / record-selection stage (depth 1) framing.
          position: types.compound({ x: -0.09, y: -1.71, z: 1.19 }),
          lookAt: types.compound({ x: 0, y: -0.19, z: -0.21 }),
        },
        { reconfigure: true },
      ),
    [],
  )
  useFrame(() => {
    const v = obj.value
    cam.position.set(v.position.x, v.position.y, v.position.z)
    cam.lookAt(v.lookAt.x, v.lookAt.y, v.lookAt.z)
  })
  return null
}

// Dev readout: while orbiting, writes the live camera position + orbit target to
// a DOM node so you can copy the framing into the Theatre Camera object.
function CameraReadout({ readoutRef }: { readoutRef: React.RefObject<HTMLDivElement | null> }) {
  const controls = useThree((s) => s.controls) as unknown as { target?: THREE.Vector3 } | null
  const scene = useThree((s) => s.scene)
  useFrame(({ camera }) => {
    const el = readoutRef.current
    if (!el) return
    const p = camera.position
    const t = controls?.target
    const disc = scene.getObjectByName('disc-stage')
    const f = (n: number) => n.toFixed(2)
    const deg = (n: number) => ((n * 180) / Math.PI).toFixed(1)
    el.textContent =
      `position [${f(p.x)}, ${f(p.y)}, ${f(p.z)}]` +
      (t ? `   lookAt [${f(t.x)}, ${f(t.y)}, ${f(t.z)}]` : '') +
      (disc
        ? `\ndisc rotation° [${deg(disc.rotation.x)}, ${deg(disc.rotation.y)}, ${deg(disc.rotation.z)}]`
        : '')
  })
  return null
}

type PoseSnapshot = {
  camera: { position: number[]; lookAt: number[] }
  disc: { position: number[]; rotationDeg: number[]; scale: number }
}

// Mirrors the LIVE camera + disc-stage transform into a ref every frame, so the
// "copy current pose" button can snapshot it at click time. Disc rotation is the
// stage group (Theatre) rotation — it EXCLUDES the continuous spin (child group).
function PoseCapture({ poseRef }: { poseRef: React.RefObject<PoseSnapshot> }) {
  const scene = useThree((s) => s.scene)
  const controls = useThree((s) => s.controls) as unknown as { target?: THREE.Vector3 } | null
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    const r = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d
    const deg = (n: number) => r((n * 180) / Math.PI, 1)
    const p = poseRef.current
    p.camera.position = [r(camera.position.x), r(camera.position.y), r(camera.position.z)]
    const disc = scene.getObjectByName('disc-stage')
    if (controls?.target) {
      p.camera.lookAt = [r(controls.target.x), r(controls.target.y), r(controls.target.z)]
    } else if (disc) {
      disc.getWorldPosition(tmp)
      p.camera.lookAt = [r(tmp.x), r(tmp.y), r(tmp.z)]
    }
    if (disc) {
      p.disc.position = [r(disc.position.x), r(disc.position.y), r(disc.position.z)]
      p.disc.rotationDeg = [deg(disc.rotation.x), deg(disc.rotation.y), deg(disc.rotation.z)]
      p.disc.scale = r(disc.scale.x)
    }
  })
  return null
}

// Drives the Theatre sequence playhead from the app's drill-in depth, so the
// keyframed camera (position + lookAt) AND disc/element transforms animate in
// sync with navigation: depth 0 = dashboard, 1 = project/tracks, 2 = track.
// (Keyframe those poses at t=0/1/2s in Theatre Studio; this scrubs between them.)
function SequenceDriver() {
  useFrame(() => {
    const target = useDepthStore.getState().depth
    const seq = sheet.sequence
    seq.position = THREE.MathUtils.lerp(seq.position, target, 0.06)
  })
  return null
}

// Procedural groove normal map (ported from VinylDisc): concentric ridge/valley
// rings so the flat disc face reads as grooved vinyl. Applied to the glass, the
// grooves perturb the refraction/highlights — visible ripples through the pane.
function makeGrooveNormalMap(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2

  // Neutral base — (128, 128, 255) means "no deflection from surface normal".
  ctx.fillStyle = '#8080ff'
  ctx.fillRect(0, 0, size, size)

  // 1.7× more rings than the original (step 3 / cycle 6) so it reads more like
  // a real densely-grooved vinyl. Lines thinned so the tighter rings stay crisp.
  const density = 1.7
  const step = 3 / density
  const period = 6 / density
  for (let r = 18; r < size / 2 - 4; r += step) {
    const isRidge = r % period < period / 2
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = isRidge ? 'rgba(172, 172, 255, 0.5)' : 'rgba(44, 44, 188, 0.5)'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  return new THREE.CanvasTexture(canvas)
}

// Center label — a warm neutral that recedes into the app's bright, warm palette.
// `wash` pushes the base neutral toward white (0 = soft greige, 1 = white).
function CenterLabel({ wash }: { wash: number }) {
  const col = useMemo(() => new THREE.Color('#cdc4bc').lerp(new THREE.Color('#ffffff'), wash), [wash])
  return (
    <mesh position={[0, 0, 0.02]}>
      <circleGeometry args={[0.38, 96]} />
      <meshBasicMaterial color={col} toneMapped={false} />
    </mesh>
  )
}

// Track grooves: one concentric arc per track, laid flat in the disc face. Arc
// length = stage progress, color = track hue, additive glow so it reads as light
// shining through the vinyl. Hover/click use a manual window raycaster because
// the canvas is pointer-events:none. Lives in the (non-spinning) float group so
// the strips stay readable while the grooved disc spins beneath them.
// Gold shown once a track reaches the final stage (release / distribution).
const TRACK_GOLD = '#ffcf3a'

// Soft upward "light plume" texture: brightest at the base, fading up and out —
// used (additively, tinted per track) for rays rising off the strips.
function makeRayTexture(): THREE.CanvasTexture {
  const s = 128
  const c = document.createElement('canvas')
  c.width = s
  c.height = s
  const ctx = c.getContext('2d')!
  // Radial plume from the bottom-centre that fades to fully transparent well
  // before the edges, so the plane's rectangular bounds are never visible.
  const g = ctx.createRadialGradient(s / 2, s, 0, s / 2, s, s * 0.72)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.14)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  return new THREE.CanvasTexture(c)
}

function TrackRings() {
  const tracks = useDepthStore((s) => s.tracks)
  const hoveredId = useDepthStore((s) => s.hoveredTrackId)
  const groupRef = useRef<THREE.Group>(null!)
  const raysRef = useRef<THREE.Group>(null!)
  const { camera, gl } = useThree()
  const rayTex = useMemo(() => makeRayTexture(), [])

  const cfg = useControls('Vinyl tracks', {
    innerR: { value: 0.4, min: 0.1, max: 1, step: 0.01 },
    outerR: { value: 0.95, min: 0.1, max: 1.2, step: 0.01 },
    ringGap: { value: 0.35, min: 0, max: 0.9, step: 0.05 },
    // Negative/small = set inside the disc so the frosted glass diffuses the arc.
    zOffset: { value: 0.005, min: -0.06, max: 0.06, step: 0.002 },
  })
  const rays = useControls('Vinyl light rays', {
    enabled: { value: false },
    height: { value: 1.4, min: 0, max: 5, step: 0.1 },
    intensity: { value: 0.35, min: 0, max: 3, step: 0.05 },
    hoverIntensity: { value: 1.1, min: 0, max: 6, step: 0.1 },
  })

  // Hover + click via a manual raycaster (works despite pointer-events:none).
  useEffect(() => {
    const el = gl.domElement
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const pick = (clientX: number, clientY: number): string | null => {
      const r = el.getBoundingClientRect()
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(groupRef.current?.children ?? [], true)
      const hit = hits.find((h) => h.object.userData?.trackId)
      return (hit?.object.userData.trackId as string) ?? null
    }
    const onMove = (e: PointerEvent) => {
      const next = pick(e.clientX, e.clientY)
      const st = useDepthStore.getState()
      if (next !== st.hoveredTrackId) st.setHoveredTrackId(next) // avoid redundant re-renders
    }
    const onClick = (e: MouseEvent) => {
      const id = pick(e.clientX, e.clientY)
      const sel = useDepthStore.getState().onSelectTrack
      if (id && sel) sel(id)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('click', onClick)
    }
  }, [camera, gl])

  // Billboard the rays around world-Y so the upward plumes always face the camera.
  useFrame(() => {
    if (raysRef.current) raysRef.current.rotation.y = Math.atan2(camera.position.x, camera.position.z)
  })

  const n = Math.max(tracks.length, 1)
  const ringThk = (cfg.outerR - cfg.innerR) / n

  return (
    <>
      <group ref={groupRef}>
        {tracks.map((track, i) => {
          const outer = cfg.outerR - i * ringThk
          const inner = outer - ringThk * (1 - cfg.ringGap)
          const prog = STAGE_VALUE[track.stage as keyof typeof STAGE_VALUE] ?? 0
          const released = prog >= 0.999
          const color = released ? TRACK_GOLD : trackHue(track.id)
          const isH = hoveredId === track.id
          // Always show a visible colored segment (even at 0% / idea stage) so the
          // track reads on the disc; it grows with progress, full gold at release.
          const arc = Math.max(prog, 0.12) * Math.PI * 2
          const arcStart = -Math.PI / 2 + 0.075 - arc / 2
          // Default = toned toward white (calm); hover = full vivid color.
          const arcColor = isH ? color : new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4)
          return (
            <group key={track.id}>
              {/* colored progress arc — OPAQUE and set INSIDE the disc (behind the
                  front glass), so the frosted vinyl diffuses it into a soft glow
                  rising from within rather than a sticker on top. */}
              <mesh position={[0, 0, cfg.zOffset]}>
                <ringGeometry args={[inner, outer, 128, 1, arcStart, arc]} />
                <meshBasicMaterial color={arcColor} toneMapped={false} />
              </mesh>
              {/* invisible full-band hit ring for raycasting */}
              <mesh position={[0, 0, cfg.zOffset]} userData={{ trackId: track.id }}>
                <ringGeometry args={[inner - ringThk * 0.15, outer + ringThk * 0.15, 48]} />
                <meshBasicMaterial visible={false} />
              </mesh>
            </group>
          )
        })}
      </group>

      {/* Upward light-ray plumes rising off the strips (billboarded). */}
      {rays.enabled && (
        <group ref={raysRef}>
          {tracks.map((track, i) => {
            const outer = cfg.outerR - i * ringThk
            const prog = STAGE_VALUE[track.stage as keyof typeof STAGE_VALUE] ?? 0
            const released = prog >= 0.999
            const color = released ? TRACK_GOLD : trackHue(track.id)
            const isH = hoveredId === track.id
            const inten = (isH ? rays.hoverIntensity : rays.intensity) * (0.25 + prog * 0.75)
            return (
              <mesh key={track.id} position={[0, rays.height / 2, cfg.zOffset]}>
                <planeGeometry args={[outer * 2, rays.height]} />
                <meshBasicMaterial
                  map={rayTex}
                  color={color}
                  transparent
                  opacity={inten}
                  toneMapped={false}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )
          })}
        </group>
      )}
    </>
  )
}

// Minimal DOM caption showing the hovered track's name — clean, unobtrusive.
function TrackCaption() {
  const hoveredId = useDepthStore((s) => s.hoveredTrackId)
  const tracks = useDepthStore((s) => s.tracks)
  const track = tracks.find((x) => x.id === hoveredId)
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 56,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 15,
      }}
    >
      <div
        style={{
          opacity: track ? 1 : 0,
          transform: track ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.25s, transform 0.25s',
          padding: '8px 18px',
          borderRadius: 999,
          background: 'rgba(20,18,26,0.55)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          font: '500 14px system-ui, -apple-system, sans-serif',
          letterSpacing: '0.02em',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          whiteSpace: 'nowrap',
        }}
      >
        {track && (
          <>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: trackHue(track.id) }} />
            <span>{track.title}</span>
            <span style={{ opacity: 0.6, fontSize: 12 }}>
              {STAGE_LABEL[track.stage as keyof typeof STAGE_LABEL] ?? ''}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// The record: frosted-glass disc + cover label + spindle. Stage transform is
// Theatre-keyframeable; spin & float are continuous loops with Leva-tuned speeds.
function Record() {
  const grooveMap = useMemo(() => makeGrooveNormalMap(), [])
  const labelCfg = useControls('Vinyl label', {
    wash: { value: 0.35, min: 0, max: 1, step: 0.05 },
  })
  const stage = useRef<THREE.Group>(null!)
  const float = useRef<THREE.Group>(null!)
  const spin = useRef<THREE.Group>(null!)

  // Theatre: the disc's keyframeable "stage" transform (position/rotation/scale).
  const disc = useMemo(
    () =>
      sheet.object(
        'Disc',
        {
          position: types.compound({ x: 0, y: 0, z: 0 }),
          rotation: types.compound({ x: 0, y: 0, z: 0 }),
          scale: types.number(1, { range: [0, 4] }),
        },
        { reconfigure: true },
      ),
    [],
  )

  // Leva: continuous loop speeds (spin + float bob).
  const loops = useControls('Vinyl loops', {
    spinSpeed: { value: 0.6, min: 0, max: 4, step: 0.05 },
    floatSpeed: { value: 0.35, min: 0, max: 4, step: 0.05 },
    floatAmplitude: { value: 0.04, min: 0, max: 0.4, step: 0.005 },
  })

  // Leva: frost / transmission material knobs. Defaults tuned so the disc reads
  // as a near-flat clear pane that shows the moving background color-field
  // (minimal lensing, no back-face ghost).
  const mat = useControls('Vinyl material', {
    // Glass type: 'transmission' = drei (frosty/stylized), 'physical' = native
    // three transmission (crisper, cleaner clear glass, supports dispersion).
    glassKind: { value: 'physical', options: ['physical', 'transmission'] },
    dispersion: { value: 4.8, min: 0, max: 10, step: 0.1 }, // physical only: prismatic edges
    throughSat: { value: 7.9, min: 0, max: 15, step: 0.1, label: 'through-disc saturation' }, // physical only
    // Clarity: higher resolution = sharper background through the glass.
    resolution: { value: 2048, min: 256, max: 2048, step: 256 },
    samples: { value: 9, min: 1, max: 20, step: 1 },
    transmission: { value: 0.45, min: 0, max: 1, step: 0.01 },
    thickness: { value: 0, min: 0, max: 2, step: 0.01 },
    roughness: { value: 0.47, min: 0, max: 1, step: 0.01, label: 'frost (0 clear → 1 frosted)' },
    grooveDepth: { value: 0.7, min: 0, max: 4, step: 0.1 },
    ior: { value: 1.53, min: 1, max: 2.333, step: 0.01 },
    chromaticAberration: { value: 0.35, min: 0, max: 1, step: 0.01 },
    anisotropy: { value: 0.52, min: 0, max: 1, step: 0.01 },
    distortion: { value: 0.15, min: 0, max: 1, step: 0.01 },
    distortionScale: { value: 0, min: 0, max: 1, step: 0.01 },
    temporalDistortion: { value: 0, min: 0, max: 1, step: 0.01 },
    color: '#ffffff',
    backside: false, // off = no double-refraction "disc-in-disc" ghost
  })
  // Pull out the non-MeshTransmissionMaterial keys; the rest (glass) maps 1:1
  // to MeshTransmissionMaterial props.
  const { grooveDepth, glassKind, dispersion, throughSat, ...glass } = mat

  // Patch the physical glass so saturation is boosted on the disc's FINAL color
  // — i.e. only what refracts through it — without touching the backdrop.
  const shaderRef = useRef<{ uniforms: { uThroughSat: { value: number } } } | null>(null)
  const patchGlass = useCallback((shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uThroughSat = { value: 1 }
    shader.fragmentShader =
      'uniform float uThroughSat;\n' +
      shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `{
          float _l = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
          gl_FragColor.rgb = mix(vec3(_l), gl_FragColor.rgb, uThroughSat);
        }
        #include <dithering_fragment>`,
      )
    shaderRef.current = shader as unknown as typeof shaderRef.current
  }, [])

  useFrame((state, delta) => {
    // Stage transform from Theatre (keyframed sequences).
    const v = disc.value
    stage.current.position.set(v.position.x, v.position.y, v.position.z)
    stage.current.rotation.set(v.rotation.x, v.rotation.y, v.rotation.z)
    stage.current.scale.setScalar(v.scale)
    // Continuous loops. Spin about Z now that the disc faces the camera.
    spin.current.rotation.z += delta * loops.spinSpeed
    float.current.position.y = Math.sin(state.clock.elapsedTime * loops.floatSpeed) * loops.floatAmplitude
    // Live through-disc saturation.
    if (shaderRef.current) shaderRef.current.uniforms.uThroughSat.value = throughSat
  })

  return (
    <group ref={stage} name="disc-stage">
      <group ref={float}>
        <group ref={spin}>
          {/* disc body — grooved glass, stood up to face the camera (+Z) so the
              refraction reads naturally instead of inverting. */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1, 1, 0.03, 128]} />
            {glassKind === 'physical' ? (
              // Native three transmission — crisper clean glass, with dispersion.
              <meshPhysicalMaterial
                transmission={glass.transmission}
                thickness={glass.thickness}
                roughness={glass.roughness}
                ior={glass.ior}
                dispersion={dispersion}
                color={glass.color}
                metalness={0}
                normalMap={grooveMap}
                normalScale={[grooveDepth, grooveDepth]}
                onBeforeCompile={patchGlass}
              />
            ) : (
              <MeshTransmissionMaterial
                {...glass}
                normalMap={grooveMap}
                normalScale={[grooveDepth, grooveDepth]}
              />
            )}
          </mesh>
          {/* center label: warm neutral that blends into the palette. */}
          <CenterLabel wash={labelCfg.wash} />
          {/* spindle hole */}
          <mesh position={[0, 0, 0.021]}>
            <circleGeometry args={[0.02, 32]} />
            <meshBasicMaterial color="#0a0a0a" toneMapped={false} />
          </mesh>
        </group>
        {/* Track groove strips — static (outside spin) so they stay readable. */}
        <TrackRings />
      </group>
    </group>
  )
}

export function VinylScene() {
  // Dev "adjust" mode: when on, the canvas jumps on top (z-50) with pointer
  // events so OrbitControls can rotate / scroll-zoom / pan ("walk") the camera.
  // When off, the canvas drops back to the z-5 passthrough and Theatre's
  // CameraRig drives the camera again.
  const nav = useControls('Camera', {
    adjust: { value: false, label: 'adjust (orbit / zoom / walk)' },
  })
  const readoutRef = useRef<HTMLDivElement>(null)
  const poseRef = useRef<PoseSnapshot>({
    camera: { position: [0, 0, 0], lookAt: [0, 0, 0] },
    disc: { position: [0, 0, 0], rotationDeg: [0, 0, 0], scale: 1 },
  })
  // Show/hide the in-scene backdrop the glass refracts. With it off the glass has
  // nothing to refract (WebGL can't see the DOM page), so the disc goes dark —
  // this toggle just makes that visible for comparison.
  const { showBackdrop } = useControls('Backdrop', { showBackdrop: { value: true } })

  // Scene lights — fully adjustable (intensity, color, position) and exportable.
  const lights = useControls('Lights', {
    ambient: { value: 0.95, min: 0, max: 3, step: 0.05 },
    key: { value: 1.0, min: 0, max: 5, step: 0.05 },
    keyPos: { value: { x: 3, y: 5, z: 2 }, label: 'key position' },
    fill: { value: 1.8, min: 0, max: 5, step: 0.05 },
    fillColor: '#c8a24b',
    fillPos: { value: { x: -4, y: 1.5, z: -3 }, label: 'fill position' },
  })

  // Environment map (IBL): adds real reflections to the glass + overall lighting.
  // Presets stream an HDRI from a CDN, so 'none' avoids any network fetch.
  const env = useControls('Environment', {
    preset: {
      value: 'none',
      options: ['none', 'sunset', 'dawn', 'night', 'warehouse', 'forest', 'apartment', 'studio', 'city', 'park', 'lobby'],
    },
    envIntensity: { value: 0, min: 0, max: 3, step: 0.1 },
  })

  // One-click export: copy every disc setting (material/distortion/loops/backdrop/
  // lights) as JSON to the clipboard, to paste back into code as defaults.
  useControls('Export', {
    'copy all settings': button((get) => {
      const settings = {
        material: {
          glassKind: get('Vinyl material.glassKind'),
          dispersion: get('Vinyl material.dispersion'),
          throughSat: get('Vinyl material.throughSat'),
          resolution: get('Vinyl material.resolution'),
          samples: get('Vinyl material.samples'),
          transmission: get('Vinyl material.transmission'),
          thickness: get('Vinyl material.thickness'),
          roughness: get('Vinyl material.roughness'),
          grooveDepth: get('Vinyl material.grooveDepth'),
          ior: get('Vinyl material.ior'),
          chromaticAberration: get('Vinyl material.chromaticAberration'),
          anisotropy: get('Vinyl material.anisotropy'),
          distortion: get('Vinyl material.distortion'),
          distortionScale: get('Vinyl material.distortionScale'),
          temporalDistortion: get('Vinyl material.temporalDistortion'),
          color: get('Vinyl material.color'),
          backside: get('Vinyl material.backside'),
        },
        loops: {
          spinSpeed: get('Vinyl loops.spinSpeed'),
          floatSpeed: get('Vinyl loops.floatSpeed'),
          floatAmplitude: get('Vinyl loops.floatAmplitude'),
        },
        backdrop: {
          saturation: get('Backdrop.saturation'),
          contrast: get('Backdrop.contrast'),
          showBackdrop: get('Backdrop.showBackdrop'),
        },
        lights: {
          ambient: get('Lights.ambient'),
          key: get('Lights.key'),
          keyPos: get('Lights.keyPos'),
          fill: get('Lights.fill'),
          fillColor: get('Lights.fillColor'),
          fillPos: get('Lights.fillPos'),
        },
        environment: {
          preset: get('Environment.preset'),
          envIntensity: get('Environment.envIntensity'),
        },
      }
      const text = JSON.stringify(settings, null, 2)
      navigator.clipboard.writeText(text).then(
        () => console.log('[VinylScene] settings copied to clipboard:\n' + text),
        () => console.log('[VinylScene] clipboard blocked; settings below:\n' + text),
      )
    }),
    // Snapshot the LIVE camera + disc transform (disc rotation excludes the spin).
    'copy current pose': button(() => {
      const text = JSON.stringify(poseRef.current, null, 2)
      navigator.clipboard.writeText(text).then(
        () => console.log('[VinylScene] pose copied to clipboard:\n' + text),
        () => console.log('[VinylScene] clipboard blocked; pose below:\n' + text),
      )
    }),
  })

  return (
    <>
      {/* Leva panel — dev-only. Widened so longer labels/values aren't clipped. */}
      <Leva
        collapsed
        hidden={!import.meta.env.DEV}
        theme={{
          sizes: {
            rootWidth: '360px',
            controlWidth: '150px',
            numberInputMinWidth: '60px',
          },
        }}
      />
      {nav.adjust && (
        <div
          ref={readoutRef}
          style={{
            position: 'fixed',
            bottom: 8,
            left: 8,
            zIndex: 60,
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.65)',
            color: '#fff',
            font: '12px ui-monospace, SFMono-Regular, monospace',
            pointerEvents: 'none',
            whiteSpace: 'pre',
          }}
        />
      )}
      <TrackCaption />
      <Canvas
        camera={{ position: [-0.09, -1.71, 1.19], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}            /* full retina sharpness (lower to [1,1.5] for mobile perf) */
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: nav.adjust ? 50 : 5,
          pointerEvents: nav.adjust ? 'auto' : 'none',
        }}
      >
        <ambientLight intensity={lights.ambient} />
        <directionalLight position={[lights.keyPos.x, lights.keyPos.y, lights.keyPos.z]} intensity={lights.key} />
        <directionalLight
          position={[lights.fillPos.x, lights.fillPos.y, lights.fillPos.z]}
          intensity={lights.fill}
          color={lights.fillColor}
        />
        {env.preset !== 'none' && (
          <Suspense fallback={null}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Environment preset={env.preset as any} environmentIntensity={env.envIntensity} />
          </Suspense>
        )}
        {nav.adjust ? (
          <>
            {/* Rotate = left-drag, zoom = scroll, walk/pan = right-drag (or 2-finger). */}
            <OrbitControls makeDefault enableRotate enableZoom enablePan screenSpacePanning enableDamping />
            <CameraReadout readoutRef={readoutRef} />
          </>
        ) : (
          <CameraRig />
        )}
        {showBackdrop && <Backdrop />}
        <Record />
        <SequenceDriver />
        <PoseCapture poseRef={poseRef} />
      </Canvas>
    </>
  )
}
