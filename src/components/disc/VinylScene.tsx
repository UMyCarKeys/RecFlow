import { useRef, useMemo, useEffect, useCallback, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MeshTransmissionMaterial, OrbitControls, Environment, Text } from '@react-three/drei'
import { useControls, button, Leva } from 'leva'
import * as THREE from 'three'
import { useDepthStore } from '@/store/depthStore'
import { useSleeveTransition, DISC_ENTRANCE_S, TEXT_REVEAL_AFTER_CLEAR_S } from '@/store/sleeveTransition'
import { useThemeStore, THEME_SCENE } from '@/store/themeStore'
// Bundled locally (Noto Sans, OFL) so 3D text never fetches from a CDN at
// runtime — the jsDelivr font request was a prod CSP/reliability liability.
import textFontUrl from '@/assets/fonts/text-sans.woff'
import { STAGE_VALUE } from '@/lib/progress'
import { trackHue } from '@/lib/trackColor'

/**
 * VinylScene — Path A frosted-glass vinyl, wired for in-browser authoring.
 *
 * A separate R3F canvas that sits OVER the page. Inside it we render a backdrop
 * plane running an fbm color-field shader — this IS the app's background on
 * every page (there is no separate 2D background layer), and it also gives
 * the transmissive vinyl something to refract.
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

// The disc's resting "stage" transform (identity). Camera/entrance handle motion.
const DISC_POSE = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 }

// Module-level (not a ref): the troika font warm-up must run exactly once per
// page load, even across StrictMode's double effect-run and canvas remounts —
// each run re-parsed the font and touched the GPU, feeding the context churn.
let fontPreloadStarted = false

// --- perf / power helpers -------------------------------------------------
// This scene renders a full-screen WebGL canvas with a per-pixel noise shader
// plus a transmissive-glass material every frame, which can push GPU/CPU (and
// fan noise) higher than a typical page. These two hooks let it back off:
//   - pause the render loop entirely while the tab is backgrounded
//   - respect the OS/browser "reduce motion" preference by stopping the
//     continuous spin/float loops (the disc still renders, just holds still)
// Neither changes any data flow — they only gate rendering/animation.

// Tracks document visibility so the Canvas can stop its render loop when the
// tab isn't visible (background tab), instead of rendering at full rate
// off-screen forever.
function useIsPageVisible(): boolean {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible')
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}

// Recovers from silent WebGL context loss (the canvas just blanks, usually no
// console error): preventDefault on `webglcontextlost` is REQUIRED for the
// browser to even attempt a restore; if the restore doesn't arrive shortly,
// we fall back to fully remounting the Canvas so the scene always comes back.
function ContextGuard({ onNeedsRemount }: { onNeedsRemount: () => void }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    let restoreTimer: number | undefined
    const onLost = (e: Event) => {
      e.preventDefault()
      console.warn('[VinylScene] WebGL context lost — waiting for restore')
      restoreTimer = window.setTimeout(() => {
        console.warn('[VinylScene] context not restored — remounting canvas')
        onNeedsRemount()
      }, 1500)
    }
    const onRestored = () => {
      console.info('[VinylScene] WebGL context restored')
      if (restoreTimer) window.clearTimeout(restoreTimer)
    }
    el.addEventListener('webglcontextlost', onLost)
    el.addEventListener('webglcontextrestored', onRestored)
    return () => {
      el.removeEventListener('webglcontextlost', onLost)
      el.removeEventListener('webglcontextrestored', onRestored)
      if (restoreTimer) window.clearTimeout(restoreTimer)
    }
  }, [gl, onNeedsRemount])
  return null
}

// Tracks the `prefers-reduced-motion` media query.
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

// Theatre.js Studio (the editor UI) is intentionally NOT initialized — the scene
// ships without any editing interface. Theatre core still drives the sheet/objects.

// ---- the app's background fragment shader, rendered here as an in-scene backdrop ----
const BACKDROP_FRAG = /* glsl */ `
precision highp float;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_depth;
uniform float u_sat;
uniform float u_contrast;
uniform float u_blur;
// Theme palette (set per-frame from THEME_SCENE — bright / earth / dark)
uniform vec3 u_base;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_c4;
varying vec2 vUv;

float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
// 4 octaves (was 5): the field is blurred by main() below, so the finest octave
// was invisible — and this shader runs full-screen twice per frame on project
// pages (main render + the glass's transmission pass), so it's the hot path.
float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.; a*=.5; } return v; }

// The colour field at a single uv sample.
vec3 field(vec2 uv){
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = uv; p.x *= aspect;
  float zoom = 1.0 - u_depth * 0.26;
  vec2 center = 0.5 * vec2(aspect, 1.0);
  p = (p - center) * zoom + center;
  float t = u_time * 0.075;
  vec2 mouseOff = u_mouse * 0.12;
  vec2 q = vec2(fbm(p+vec2(0.,t)+mouseOff), fbm(p+vec2(5.2,-t)+mouseOff));
  vec2 r = vec2(fbm(p+2.*q+vec2(1.7,9.2)+t*.5), fbm(p+2.*q+vec2(8.3,2.8)-t*.5));
  float f = fbm(p+2.5*r);
  vec3 col=u_base;
  col=mix(col,u_c3, smoothstep(0.,.85,f)*.55);
  col=mix(col,u_c1, smoothstep(.15,1.,r.x)*.55);
  col=mix(col,u_c2, smoothstep(.25,1.,q.y)*.48);
  col=mix(col,u_c4, smoothstep(.35,1.,r.y)*.5);
  col=mix(u_base,col,smoothstep(0.,.8,f+.25));
  float lum=dot(col,vec3(.299,.587,.114));
  col=mix(vec3(lum),col,u_sat);
  col=(col-0.5)*u_contrast+0.5; // push contrast so the glass has something to refract
  return clamp(col,0.,1.);
}

void main(){
  // 5-tap blur of the field only (this plane), so the environment softens while
  // the disc / arcs (separate meshes) stay sharp. (Dropped the 4 diagonal taps
  // from the original 9-tap version — visually near-identical since the field
  // is already low-frequency, but ~45% fewer fbm evaluations per pixel, which
  // is meaningful since this runs full-screen every frame.)
  float b = u_blur;
  vec3 col = field(vUv) * 0.4;
  col += field(vUv + vec2( b, 0.)) * 0.15;
  col += field(vUv + vec2(-b, 0.)) * 0.15;
  col += field(vUv + vec2(0.,  b)) * 0.15;
  col += field(vUv + vec2(0., -b)) * 0.15;
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
  const { size, camera } = useThree()
  // Track the mouse from a window listener (the canvas is pointer-events:none, so
  // R3F's own pointer state never updates) — keeps the field mouse-reactive.
  const mouse = useMemo(() => new THREE.Vector2(0, 0), [])
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [mouse])
  // Saturation knob: the page palette is near-white, so raise this to make the
  // colored "lights" read through the transmissive disc. Defaults (1.45
  // saturation, no extra contrast) match the rest of the app's warm palette.
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
      u_blur: { value: 0.02 }, // soft frost on the environment only (this plane)
      u_base: { value: new THREE.Vector3(...THEME_SCENE.bright.base) },
      u_c1: { value: new THREE.Vector3(...THEME_SCENE.bright.c1) },
      u_c2: { value: new THREE.Vector3(...THEME_SCENE.bright.c2) },
      u_c3: { value: new THREE.Vector3(...THEME_SCENE.bright.c3) },
      u_c4: { value: new THREE.Vector3(...THEME_SCENE.bright.c4) },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useFrame((state) => {
    uniforms.u_time.value = state.clock.elapsedTime
    uniforms.u_resolution.value.set(size.width, size.height)
    uniforms.u_mouse.value.lerp(mouse, 0.06)
    uniforms.u_depth.value = useDepthStore.getState().depth
    uniforms.u_sat.value = bg.saturation
    uniforms.u_contrast.value = bg.contrast
    // Theme palette — set every frame (cheap), switched instantly under the
    // ThemeFx "lights" flicker that masks the jump.
    const pal = THEME_SCENE[useThemeStore.getState().theme]
    uniforms.u_base.value.set(...pal.base)
    uniforms.u_c1.value.set(...pal.c1)
    uniforms.u_c2.value.set(...pal.c2)
    uniforms.u_c3.value.set(...pal.c3)
    uniforms.u_c4.value.set(...pal.c4)

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

// Camera pose per drill-in depth: 1 = project / track-selection, 2 = single track.
const STAGE_CAM: Record<number, { pos: [number, number, number]; look: [number, number, number] }> = {
  1: { pos: [-0.09, -1.71, 1.19], look: [0, -0.19, -0.21] },
  2: { pos: [0, -1.05, 0.19], look: [0.05, -0.26, -0.36] },
}

// Camera rig: smoothly flies the camera to the pose for the current app depth,
// so drilling from the record into a single track re-frames the vinyl.
function CameraRig() {
  const cam = useThree((s) => s.camera)
  const look = useMemo(() => new THREE.Vector3(...STAGE_CAM[1].look), [])
  const tPos = useMemo(() => new THREE.Vector3(), [])
  const tLook = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, delta) => {
    const depth = useDepthStore.getState().depth
    const s = STAGE_CAM[depth] ?? STAGE_CAM[1]
    const a = 1 - Math.pow(0.005, delta) // frame-rate-independent smoothing
    cam.position.lerp(tPos.set(...s.pos), a)
    look.lerp(tLook.set(...s.look), a)
    cam.lookAt(look)
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

// Procedural groove normal map (ported from VinylDisc): concentric ridge/valley
// rings so the flat disc face reads as grooved vinyl. Applied to the glass, the
// grooves perturb the refraction/highlights — visible ripples through the pane.
// Also scatters fine hairline scratches and tiny "dings" (impact dents) across
// the face, so the disc reads as a real, handled record rather than a pristine
// pane of glass. All baked into the same normal map (one canvas, one texture,
// computed once at mount) so it costs nothing per-frame and needs no extra
// material props/uniforms on either glass path (physical or transmission).
function makeGrooveNormalMap(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 4
  const holeR = 26 // keep marks off the spindle hole

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

  // Random point within the annulus between the spindle hole and the disc edge.
  const randomDiscPoint = () => {
    const a = Math.random() * Math.PI * 2
    const r = holeR + Math.sqrt(Math.random()) * (outerR - holeR)
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a, r }
  }

  // Fine hairline scratches: short, faintly curved strokes at random angles.
  // Each is nudged slightly off the neutral blue-purple along its perpendicular
  // — a cheap-but-convincing way to fake a shallow groove catching the light,
  // without a second highlight/shadow pass.
  //
  // IMPORTANT — keep these nudges subtle: this map feeds normalMap on the
  // disc's TRANSMISSIVE glass, and that disc mesh spins continuously while
  // the colored track arcs sit still just behind it (refracted through the
  // glass). The concentric groove rings above are radially symmetric, so
  // spinning them is visually a no-op (rotating a ring pattern around its own
  // center looks identical every frame) — the arcs read as solid. Scratches/
  // dings are scattered at random angles, i.e. NOT rotationally symmetric, so
  // if their normal perturbation is too strong, the spinning disc visibly
  // "bends" the refracted arc colors underneath every frame as each scratch
  // sweeps past — reading as the arcs continuously morphing/rippling in sync
  // with the spin. Keeping the nudge/opacity low here keeps them a faint
  // surface detail instead of something strong enough to distort refraction.
  const SCRATCH_COUNT = 90
  for (let i = 0; i < SCRATCH_COUNT; i++) {
    const { x, y } = randomDiscPoint()
    const angle = Math.random() * Math.PI * 2
    const len = 6 + Math.random() * 22
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    // Slight arc instead of a dead-straight line reads more like a real scuff.
    const bow = (Math.random() - 0.5) * 6
    const mx = x + dx * (len / 2) - dy * bow
    const my = y + dy * (len / 2) + dx * bow
    const ex = x + dx * len
    const ey = y + dy * len
    // Perpendicular nudge direction encodes which way the "groove" leans.
    const px = -dy
    const py = dx
    const nudge = 6 + Math.random() * 5
    const r = Math.max(0, Math.min(255, 128 + px * nudge))
    const g = Math.max(0, Math.min(255, 128 + py * nudge))
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(mx, my, ex, ey)
    ctx.strokeStyle = `rgba(${r | 0}, ${g | 0}, 255, ${(0.05 + Math.random() * 0.08).toFixed(2)})`
    ctx.lineWidth = 0.4 + Math.random() * 0.5
    ctx.stroke()
  }

  // Tiny dings: small radial dents (soft bright-centre falloff) scattered more
  // sparsely — reads as little impact marks rather than a smooth scratch.
  // Same rationale as above: kept low-strength so they don't visibly distort
  // the (non-spinning) track arcs refracted through the spinning glass.
  const DING_COUNT = 22
  for (let i = 0; i < DING_COUNT; i++) {
    const { x, y } = randomDiscPoint()
    const rad = 1.5 + Math.random() * 3.5
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad)
    const strength = 6 + Math.random() * 8
    grad.addColorStop(0, `rgba(${128 + strength | 0}, ${128 + strength | 0}, 255, 0.16)`)
    grad.addColorStop(1, 'rgba(128, 128, 255, 0)')
    ctx.beginPath()
    ctx.fillStyle = grad
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
  }

  return new THREE.CanvasTexture(canvas)
}

// Center label — a warm neutral that recedes into the app's bright, warm palette.
// `wash` pushes the base neutral toward white (0 = soft greige, 1 = white).
function CenterLabel({ wash }: { wash: number }) {
  const col = useMemo(() => new THREE.Color('#cdc4bc').lerp(new THREE.Color('#ffffff'), wash), [wash])
  return (
    <mesh position={[0, 0, 0.02]}>
      {/* ring, not a disc — leaves the center spindle hole open to see through */}
      <ringGeometry args={[0.05, 0.38, 96]} />
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

// Flat glass disc with a REAL center hole, so the spindle hole is genuine empty
// space you see straight through. Custom radial UVs keep the concentric groove
// normal map centered (default extrude UVs would break it).
function makeHoledDiscGeometry(outer = 1, hole = 0.05, thickness = 0.03): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false)
  const holePath = new THREE.Path()
  holePath.absarc(0, 0, hole, 0, Math.PI * 2, true)
  shape.holes.push(holePath)
  const radialUV = (verts: number[], i: number) =>
    new THREE.Vector2(verts[i * 3] / (outer * 2) + 0.5, verts[i * 3 + 1] / (outer * 2) + 0.5)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 128,
    steps: 1,
    UVGenerator: {
      generateTopUV: (_g, verts, a, b, c) => [radialUV(verts, a), radialUV(verts, b), radialUV(verts, c)],
      generateSideWallUV: (_g, verts, a, b, c, d) => [
        radialUV(verts, a),
        radialUV(verts, b),
        radialUV(verts, c),
        radialUV(verts, d),
      ],
    },
  })
  geo.translate(0, 0, -thickness / 2) // centre the thickness on z=0
  return geo
}

// Progress arc with a hover bloom: default it's a toned/washed color; on hover a
// vivid glow spreads outward from the cursor's angle along the arc until it fills.
const ARC_VERT = /* glsl */ `
varying float vAngle;
void main(){ vAngle = atan(position.y, position.x); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const ARC_FRAG = /* glsl */ `
precision highp float;
varying float vAngle;
uniform vec3 uDim;
uniform vec3 uBright;
uniform float uHoverAngle;
uniform float uReach;
uniform float uFade;
void main(){
  // Spread both ways from the cursor; the arc geometry bounds it at the start
  // (clockwise) and the end (counter-clockwise).
  float d = vAngle - uHoverAngle;
  d = abs(mod(d + 3.14159265, 6.28318531) - 3.14159265);
  float glow = 1.0 - smoothstep(uReach - 0.18, uReach + 0.18, d);
  vec3 col = mix(uDim, uBright, glow);
  // Entry fade: dissolve from the backdrop's near-white into the arc color.
  // Must stay OPAQUE (alpha 1) — transparent objects are excluded from the
  // glass disc's transmission pass and would vanish behind the vinyl.
  col = mix(vec3(0.965, 0.95, 0.955), col, uFade);
  gl_FragColor = vec4(col, 1.0);
}
`

function Arc({
  inner,
  outer,
  arcStart,
  arc,
  color,
  hovered,
  z,
}: {
  inner: number
  outer: number
  arcStart: number
  arc: number
  color: string
  hovered: boolean
  z: number
}) {
  const uniforms = useMemo(
    () => ({
      uDim: { value: new THREE.Color() },
      uBright: { value: new THREE.Color() },
      uHoverAngle: { value: 0 },
      uReach: { value: 0 },
      uFade: { value: 0 },
    }),
    [],
  )
  useEffect(() => {
    uniforms.uBright.value.set(color)
    uniforms.uDim.value.set(color).lerp(new THREE.Color('#ffffff'), 0.4)
  }, [color, uniforms])
  const reach = useRef(0)
  const heldAngle = useRef(0)
  useFrame((_, delta) => {
    if (hovered) heldAngle.current = useDepthStore.getState().hoverAngle ?? heldAngle.current
    uniforms.uHoverAngle.value = heldAngle.current
    // Grow the bloom to cover the whole arc when hovered, recede when not.
    const target = hovered ? arc + 0.4 : 0
    reach.current += (target - reach.current) * Math.min(1, delta * 7)
    uniforms.uReach.value = reach.current
  })
  return (
    <mesh position={[0, 0, z]}>
      <ringGeometry args={[inner, outer, 160, 1, arcStart, arc]} />
      <shaderMaterial vertexShader={ARC_VERT} fragmentShader={ARC_FRAG} uniforms={uniforms} toneMapped={false} />
    </mesh>
  )
}

// Lays text out along a circular arc (each glyph positioned + rotated tangentially)
// so the hint curves like the colored track arcs. Concave-up "smile" at the bottom.
function ArcText({
  text,
  radius,
  fontSize,
  color,
  z,
  centerAngle = -Math.PI / 2,
  fadeIn = 0.7,
}: {
  text: string
  radius: number
  fontSize: number
  color: string
  z: number
  centerAngle?: number
  /** Seconds to fade the text in after mount (0 = instant). */
  fadeIn?: number
}) {
  const chars = useMemo(() => [...text], [text])
  const charAngle = (fontSize * 0.60) / radius // ~average glyph advance as an angle
  const total = (chars.length - 1) * charAngle
  // Smooth fade-in: drive the glyph materials' opacity imperatively in useFrame
  // (no per-frame React re-renders across ~56 <Text> children). Glyphs only
  // appear once troika finishes its async sync, by which point the opacity is
  // already being ramped — so the text eases in instead of popping.
  const glyphRefs = useRef<(THREE.Object3D | null)[]>([])
  const born = useRef<number | null>(null)
  useFrame((state) => {
    if (born.current === null) born.current = state.clock.elapsedTime
    const k = fadeIn > 0 ? Math.min(1, (state.clock.elapsedTime - born.current) / fadeIn) : 1
    const eased = k * k * (3 - 2 * k) // smoothstep
    for (const g of glyphRefs.current) {
      const m = (g as unknown as { material?: THREE.Material } | null)?.material
      if (m) {
        m.transparent = true
        m.opacity = eased
      }
    }
  })
  return (
    <group position={[0, 0, z]}>
      {chars.map((ch, i) => {
        const theta = centerAngle - total / 2 + i * charAngle
        return (
          <Text
            key={i}
            ref={(o: THREE.Object3D | null) => {
              glyphRefs.current[i] = o
            }}
            position={[Math.cos(theta) * radius, Math.sin(theta) * radius, 0]}
            rotation={[0, 0, theta + Math.PI / 2]}
            fontSize={fontSize}
            font={textFontUrl}
            anchorX="center"
            anchorY="middle"
            color={color}
          >
            {ch}
          </Text>
        )
      })}
    </group>
  )
}

function TrackRings({ showText = true }: { showText?: boolean }) {
  const tracks = useDepthStore((s) => s.tracks)
  const tracksLoading = useDepthStore((s) => s.tracksLoading)
  const depth = useDepthStore((s) => s.depth)
  const hoveredId = useDepthStore((s) => s.hoveredTrackId)
  // In-scene text color per theme — dark's backdrop needs light glyphs.
  const ink3d = THEME_SCENE[useThemeStore((s) => s.theme)].ink3d
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
    const local = new THREE.Vector3()
    const pick = (clientX: number, clientY: number): { id: string | null; angle: number } => {
      const r = el.getBoundingClientRect()
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(groupRef.current?.children ?? [], true)
      const hit = hits.find((h) => h.object.userData?.trackId)
      if (!hit) return { id: null, angle: 0 }
      // Angle of the cursor on the ring (its local frame) — where the bloom starts.
      hit.object.worldToLocal(local.copy(hit.point))
      return { id: hit.object.userData.trackId as string, angle: Math.atan2(local.y, local.x) }
    }
    // The canvas is pointer-events:none, so these window listeners see EVERY
    // click/move — including ones meant for DOM UI that sits above the canvas
    // (modals, inputs, buttons, menus). Without this guard, clicking a modal's
    // search field raycasted straight through and selected a track behind it.
    const isOverUI = (t: EventTarget | null): boolean =>
      t instanceof Element &&
      !!t.closest(
        '[data-ui-overlay], a, button, input, textarea, select, label, [role="dialog"], [role="menu"], [role="listbox"], [contenteditable="true"]',
      )
    const onMove = (e: PointerEvent) => {
      const st = useDepthStore.getState()
      if (isOverUI(e.target)) {
        if (st.hoverPoint) {
          st.setHoveredTrackId(null)
          st.setHoverPoint(null)
          st.setHoverAngle(null)
        }
        return
      }
      const { id, angle } = pick(e.clientX, e.clientY)
      if (id !== st.hoveredTrackId) st.setHoveredTrackId(id) // avoid redundant re-renders
      if (id) {
        st.setHoverPoint({ x: e.clientX, y: e.clientY })
        st.setHoverAngle(angle)
      } else if (st.hoverPoint) {
        st.setHoverPoint(null)
        st.setHoverAngle(null)
      }
    }
    const onClick = (e: MouseEvent) => {
      if (isOverUI(e.target)) return // let DOM UI handle its own clicks
      const { id } = pick(e.clientX, e.clientY)
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

  // Arc entry fade: 0 = dissolved into the backdrop, 1 = full color. Starts at
  // 0 so arcs bloom in when the record appears / when returning to the album
  // view. Pure refs — no React state, so it can never go stale.
  const fade = useRef(0)

  // Billboard the rays around world-Y so the upward plumes always face the
  // camera, and drive the arc fade from the live depth every frame.
  useFrame((_, delta) => {
    if (raysRef.current) raysRef.current.rotation.y = Math.atan2(camera.position.x, camera.position.z)

    // Full color on the album view (depth 1); dissolve when drilled into a
    // single track (depth 2+).
    const target = useDepthStore.getState().depth > 1 ? 0 : 1
    fade.current += (target - fade.current) * Math.min(1, delta * 5)
    groupRef.current?.traverse((obj) => {
      const mat = (obj as THREE.Mesh).material as THREE.ShaderMaterial | undefined
      if (mat?.uniforms?.uFade) mat.uniforms.uFade.value = fade.current
    })
  })

  const n = Math.max(tracks.length, 1)
  // Cap the ring thickness: with 1–2 tracks an even split of the groove band
  // produced slab-thick arcs that swallowed the disc. Capped rings are then
  // CENTERED in the band so a lone slim arc doesn't hug the outer edge.
  const ringThk = Math.min((cfg.outerR - cfg.innerR) / n, 0.16)
  const bandOuter = (cfg.outerR + cfg.innerR) / 2 + (n * ringThk) / 2

  return (
    <>
      {/* Empty-state hint — arced along the groove so it curves like the track
          arcs, lying in the disc plane (tilts with the vinyl).
          The LOCAL Suspense boundary is load-bearing: drei's <Text> SUSPENDS
          while its font loads, and without a boundary inside the canvas that
          suspension bubbled up to App's lazy(AppShell) fallback — unmounting
          the entire shell (dark screen + spinner + WebGL context teardown)
          the moment the hint mounted on an empty project. fallback={null}
          keeps the wait invisible; the glyphs then fade in via ArcText. */}
      {showText && depth === 1 && tracks.length === 0 && !tracksLoading && (
        <Suspense fallback={null}>
          <ArcText
            text="No active tracks yet — add one above to start the record"
            radius={0.72}
            fontSize={0.018}
            color={ink3d}
            z={cfg.zOffset + 0.02}
          />
        </Suspense>
      )}
      <group ref={groupRef}>
        {tracks.map((track, i) => {
          const outer = bandOuter - i * ringThk
          const inner = outer - ringThk * (1 - cfg.ringGap)
          const prog = STAGE_VALUE[track.stage as keyof typeof STAGE_VALUE] ?? 0
          const released = prog >= 0.999
          const color = released ? TRACK_GOLD : trackHue(track.id)
          const isH = hoveredId === track.id
          // Always show a visible colored segment (even at 0% / idea stage) so the
          // track reads on the disc; it grows with progress, full gold at release.
          const arc = Math.max(prog, 0.12) * Math.PI * 2
          // Fixed start at the lower-left (where the arc began before); the fill
          // grows counter-clockwise from there as progress increases.
          const arcStart = -Math.PI / 2 - 0.3
          // Persistent name label: curved along the ring's centerline, ending just
          // clockwise of the arc's start — it reads like a dial label pointing at
          // its arc, so tracks are identifiable before any hover.
          const labelR = (inner + outer) / 2
          const labelSize = Math.min(0.045, ringThk * 0.48)
          const title = track.title.length > 18 ? track.title.slice(0, 17) + '…' : track.title
          const labelTotal = (title.length - 1) * ((labelSize * 0.6) / labelR)
          return (
            <group key={track.id}>
              {/* colored progress arc — OPAQUE and set INSIDE the disc (behind the
                  front glass), so the frosted vinyl diffuses it. The hover glow
                  blooms outward from the cursor's angle along the arc. */}
              <Arc inner={inner} outer={outer} arcStart={arcStart} arc={arc} color={color} hovered={isH} z={cfg.zOffset} />
              {/* invisible hit area — matches the colored arc exactly, so hover /
                  click only register where the color actually is. */}
              <mesh position={[0, 0, cfg.zOffset]} userData={{ trackId: track.id }}>
                <ringGeometry args={[inner, outer, 128, 1, arcStart, arc]} />
                <meshBasicMaterial visible={false} />
              </mesh>
              {showText && (
                <Suspense fallback={null}>
                  <ArcText
                    text={title}
                    radius={labelR}
                    fontSize={labelSize}
                    color={ink3d}
                    z={cfg.zOffset + 0.015}
                    centerAngle={arcStart - 0.07 - labelTotal / 2}
                  />
                </Suspense>
              )}
            </group>
          )
        })}
      </group>

      {/* Upward light-ray plumes rising off the strips (billboarded). */}
      {rays.enabled && (
        <group ref={raysRef}>
          {tracks.map((track, i) => {
            const outer = bandOuter - i * ringThk
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

// Hover callout: the track name anchored to the hovered arc by a minimal leader
// line, positioned at the cursor point on the strip.
function TrackCaption() {
  const hoveredId = useDepthStore((s) => s.hoveredTrackId)
  const point = useDepthStore((s) => s.hoverPoint)
  const tracks = useDepthStore((s) => s.tracks)
  const track = tracks.find((x) => x.id === hoveredId)
  if (!track || !point) return null

  const OFF_X = 40 // leader line horizontal reach
  const OFF_Y = 40 // leader line vertical reach (upward)
  // Flip to the left when near the right edge so the label stays on screen.
  const left = point.x + OFF_X + 160 > window.innerWidth
  const dirX = left ? -1 : 1

  return (
    <div style={{ position: 'fixed', left: point.x, top: point.y, zIndex: 15, pointerEvents: 'none' }}>
      <svg width={Math.abs(OFF_X) + 8} height={OFF_Y + 8} style={{ position: 'absolute', left: dirX < 0 ? -OFF_X : 0, top: -OFF_Y, overflow: 'visible' }}>
        <line
          x1={dirX < 0 ? OFF_X : 0}
          y1={OFF_Y}
          x2={dirX < 0 ? 0 : OFF_X}
          y2={0}
          stroke="rgb(var(--muted))"
          strokeWidth={1}
        />
        <circle cx={dirX < 0 ? OFF_X : 0} cy={OFF_Y} r={1.8} fill="rgb(var(--muted))" />
      </svg>
      <span
        style={{
          position: 'absolute',
          left: dirX < 0 ? -OFF_X : OFF_X,
          top: -OFF_Y,
          transform: `translate(${dirX < 0 ? '-100%' : '0'}, -100%)`,
          whiteSpace: 'nowrap',
          font: '500 14px system-ui, -apple-system, sans-serif',
          color: 'rgb(var(--muted))',
        }}
      >
        {track.title}
      </span>
    </div>
  )
}

// The record: frosted-glass disc + cover label + spindle. Stage transform is
// Theatre-keyframeable; spin & float are continuous loops with Leva-tuned speeds.
function Record({ reducedMotion, showText, isTransitioning }: { reducedMotion: boolean; showText?: boolean; isTransitioning?: boolean }) {
  const grooveMap = useMemo(() => makeGrooveNormalMap(), [])
  const discGeo = useMemo(() => makeHoledDiscGeometry(), [])
  const labelCfg = useControls('Vinyl label', {
    wash: { value: 0.35, min: 0, max: 1, step: 0.05 },
  })
  // Local low-power heuristic for material defaults inside the Record.
  const isLowPowerLocal = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    const mem = (navigator as any).deviceMemory ?? 8
    const isMobile = /Mobi|Android/i.test(navigator.userAgent)
    return mem < 4 || isMobile
  }, [])
  const stage = useRef<THREE.Group>(null!)
  const float = useRef<THREE.Group>(null!)
  const spin = useRef<THREE.Group>(null!)

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
    // Lowered defaults from 2048/9 — the transmission material re-renders the
    // scene into an off-screen buffer at this resolution, this many times,
    // EVERY frame, so this is the single biggest GPU cost in the scene. Still
    // adjustable live via Leva if more clarity is needed for a demo/recording.
    // NOTE: this schema must hold the FINAL tuned values only — Leva captures
    // initial values once at mount, so putting transitional (isTransitioning)
    // values here would lock the low-quality look in permanently whenever the
    // Record first mounts mid sleeve-transition. The transition override is
    // applied at runtime via `effectiveGlass` below instead.
    resolution: { value: isLowPowerLocal ? 512 : 1024, min: 256, max: 2048, step: 256 },
    samples: { value: isLowPowerLocal ? 2 : 4, min: 1, max: 20, step: 1 },
    transmission: { value: isLowPowerLocal ? 0.35 : 0.45, min: 0, max: 1, step: 0.01 },
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
  const effectiveGlassKind = isTransitioning ? 'physical' : glassKind
  const effectiveGlass = isTransitioning
    ? {
        ...glass,
        transmission: 0.2,
        thickness: 0.2,
        roughness: 0.68,
        chromaticAberration: 0,
        anisotropy: 0,
        distortion: 0,
        distortionScale: 0,
        temporalDistortion: 0,
      }
    : glass

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

  // Sleeve entrance: when the scene mounts mid sleeve-transition (dashboard →
  // project), the disc starts FLAT (billboarded to the camera, like a record in
  // the sleeve) behind the DOM overlay, slides straight up to near the top of
  // frame, holds a beat, then angles back to the stage rotation while sliding
  // down into the tracks-view pose. Geometry is computed on the first frame.
  const entrance = useRef<{
    pending: boolean
    t0: number
    start: THREE.Vector3
    top: THREE.Vector3
    axis: THREE.Vector3
    startScale: number
    qStart: THREE.Quaternion
  } | null>(
    useSleeveTransition.getState().active
      ? {
          pending: true,
          t0: 0,
          start: new THREE.Vector3(),
          top: new THREE.Vector3(),
          axis: new THREE.Vector3(1, 0, 0),
          startScale: 0.2,
          qStart: new THREE.Quaternion(),
        }
      : null,
  )
  const tmpA = useMemo(() => new THREE.Vector3(), [])
  const tmpB = useMemo(() => new THREE.Vector3(), [])
  const tmpC = useMemo(() => new THREE.Vector3(), [])
  const qEnd = useMemo(() => new THREE.Quaternion(), [])
  const qFlip = useMemo(() => new THREE.Quaternion(), [])
  const eulerTmp = useMemo(() => new THREE.Euler(), [])

  useFrame((state, delta) => {
    // Resting stage transform (identity); the entrance + CameraRig do the motion.
    const v = DISC_POSE
    const ent = entrance.current
    if (ent) {
      const cam = state.camera
      if (ent.pending) {
        // Unproject a screen point onto the disc plane (z = 0).
        const planePoint = (nx: number, ny: number, out: THREE.Vector3) => {
          out.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize()
          const t = Math.abs(out.z) > 1e-4 ? -cam.position.z / out.z : 0
          return out.multiplyScalar(t).add(cam.position)
        }
        planePoint(0, 0, ent.start) // sleeve is screen-centred
        planePoint(0, 0.72, ent.top) // apex the disc rises to (reached now — a lerp target, so keep in frame)
        // Scale so the disc starts at the sleeve's on-screen size.
        const o = tmpA.set(0, 0, 0).project(cam)
        const ex = tmpB.set(1, 0, 0).project(cam)
        const pxR = Math.hypot(((ex.x - o.x) * state.size.width) / 2, ((ex.y - o.y) * state.size.height) / 2)
        const sleevePx = Math.min(state.size.width, state.size.height) * 0.44
        // Start a bit smaller than the sleeve so it reads as coming from depth.
        ent.startScale = Math.max(0.04, (sleevePx * 0.4) / Math.max(pxR, 1))
        // Flat in the sleeve: billboarded so the disc face is parallel to the screen.
        ent.qStart.copy(cam.quaternion)
        // Flip axis: the camera's right, so the tumble reads head-over-heels on screen.
        ent.axis.set(1, 0, 0).applyQuaternion(cam.quaternion).normalize()
        ent.t0 = state.clock.elapsedTime
        ent.pending = false
      }
      // Rise leads: the disc lifts UP first (fast off the start to clear the
      // sleeve), THEN the flip / scale / move-to-stage taper in. One continuous
      // motion — the two eases overlap so velocity never hits zero mid-flight.
      // ENTER_S duration lives in the sleeveTransition store module (see
      // DISC_ENTRANCE_S) so page-level UI (ProjectPage's header) can time its
      // own reveal to this without importing anything from this file — this
      // file pulls in three.js/@react-three and is lazy-loaded separately, so
      // keeping the shared constant in the small, dependency-free store
      // module avoids re-coupling that heavy bundle to eagerly-loaded pages.
      const p = Math.min(1, (state.clock.elapsedTime - ent.t0) / DISC_ENTRANCE_S)
      // Front-loaded vertical rise (fast, done by ~58%).
      const riseP = Math.min(1, p / 0.58)
      const riseE = 1 - Math.pow(1 - riseP, 3) // easeOutCubic
      // Back-loaded settle (starts ~30%): flip, scale, and move into the stage pose.
      const settleP = Math.min(1, Math.max(0, (p - 0.3) / 0.7))
      const settleE = settleP * settleP * (3 - 2 * settleP) // smoothstep
      // Position: rise straight up to the apex, then settle into the stage pose.
      tmpA.lerpVectors(ent.start, ent.top, riseE)
      tmpC.set(v.position.x, v.position.y, v.position.z)
      stage.current.position.lerpVectors(tmpA, tmpC, settleE)
      // Continuous single tumble that completes face-up exactly on landing.
      qEnd.setFromEuler(eulerTmp.set(v.rotation.x, v.rotation.y, v.rotation.z))
      qFlip.setFromAxisAngle(ent.axis, Math.PI * 2 * settleE)
      stage.current.quaternion.slerpQuaternions(ent.qStart, qEnd, settleE).premultiply(qFlip)
      // Stays small during the rise, grows as it settles in.
      stage.current.scale.setScalar(ent.startScale + (v.scale - ent.startScale) * settleE)
      if (p >= 1) entrance.current = null
    } else {
      stage.current.position.set(v.position.x, v.position.y, v.position.z)
      stage.current.rotation.set(v.rotation.x, v.rotation.y, v.rotation.z)
      stage.current.scale.setScalar(v.scale)
    }
    // Continuous loops. Spin about Z now that the disc faces the camera.
    // Honor prefers-reduced-motion by holding the disc still (values are
    // scaled to 0 here rather than skipped, so the Leva-tuned speeds/state
    // remain untouched and nothing else in the data flow changes).
    const motionScale = reducedMotion ? 0 : 1
    spin.current.rotation.z += delta * loops.spinSpeed * motionScale
    float.current.position.y = Math.sin(state.clock.elapsedTime * loops.floatSpeed) * loops.floatAmplitude * motionScale
    // Live through-disc saturation.
    if (shaderRef.current) shaderRef.current.uniforms.uThroughSat.value = throughSat
  })

  return (
    <group ref={stage} name="disc-stage">
      <group ref={float}>
        <group ref={spin}>
          {/* disc body — grooved glass with a real center hole; faces the camera
              (+Z) natively as an extruded ring. */}
          <mesh geometry={discGeo}>
            {effectiveGlassKind === 'physical' ? (
              // Native three transmission — crisper clean glass, with dispersion.
              <meshPhysicalMaterial
                transmission={effectiveGlass.transmission}
                thickness={effectiveGlass.thickness}
                roughness={effectiveGlass.roughness}
                ior={effectiveGlass.ior}
                dispersion={dispersion}
                color={effectiveGlass.color}
                metalness={0}
                normalMap={grooveMap}
                normalScale={[grooveDepth, grooveDepth]}
                onBeforeCompile={patchGlass}
              />
            ) : (
              <MeshTransmissionMaterial
                {...effectiveGlass}
                normalMap={grooveMap}
                normalScale={[grooveDepth, grooveDepth]}
              />
            )}
          </mesh>
          {/* center label: warm neutral that blends into the palette. */}
          <CenterLabel wash={labelCfg.wash} />
        </group>
        {/* Track groove strips — static (outside spin) so they stay readable. */}
        <TrackRings showText={showText ?? true} />
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
  // Scene light level per theme (dark = a dimmer room).
  const themeLight = THEME_SCENE[useThemeStore((s) => s.theme)].light
  // Lightweight device-power detection to pick safer defaults.
  const isLowPower = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    const mem = (navigator as any).deviceMemory ?? 8
    const isMobile = /Mobi|Android/i.test(navigator.userAgent)
    return mem < 4 || isMobile
  }, [])

  // Hide heavy text/font rendering during the sleeve entrance to avoid extra work.
  const [showText, setShowText] = useState(() => !useSleeveTransition.getState().active)
  const activeTransition = useSleeveTransition((s) => s.active)
  const isTransitioning = Boolean(activeTransition)

  useEffect(() => {
    if (activeTransition) {
      if (showText) setShowText(false)
      return
    }

    const t = setTimeout(() => setShowText(true), TEXT_REVEAL_AFTER_CLEAR_S * 1000)
    return () => clearTimeout(t)
  }, [activeTransition, showText])

  const showDisc = useDepthStore((s) => s.depth) > 0
  const isPageVisible = useIsPageVisible()
  // Tracked per project id (not a one-shot boolean) so a SECOND card click
  // after the first transition still acknowledges — the scene is app-mounted,
  // so a never-reset ref would permanently block later transitions.
  const ackedProjectId = useRef<string | null>(null)
  useEffect(() => {
    if (!activeTransition) {
      ackedProjectId.current = null
      return
    }
    if (ackedProjectId.current === activeTransition.projectId) return
    if (!showDisc) return // acknowledge only once the disc is actually visible

    ackedProjectId.current = activeTransition.projectId
    useSleeveTransition.getState().acknowledge()
  }, [activeTransition, showDisc])
  const reducedMotion = usePrefersReducedMotion()
  // Warm up the 3D-text engine (troika) at browser idle: parsing the font and
  // generating glyph SDFs uses its own GL context and was landing exactly at
  // the heaviest moment (transition + shader compiles + transmission buffer
  // alloc) — the "unsupported GPOS table" logs immediately preceding every
  // WebGL context loss. Preloading makes that a one-time idle cost instead.
  useEffect(() => {
    let cancelled = false
    const warm = () => {
      if (cancelled || fontPreloadStarted) return
      fontPreloadStarted = true
      import('troika-three-text')
        .then((mod) => {
          const preload = (mod as { preloadFont?: (opts: object, cb: () => void) => void }).preloadFont
          preload?.(
            { font: textFontUrl, characters: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 —–-.,'!?()" },
            () => {},
          )
        })
        .catch(() => {})
    }
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    const idleId = w.requestIdleCallback ? w.requestIdleCallback(warm, { timeout: 3000 }) : window.setTimeout(warm, 1200)
    return () => {
      cancelled = true
      if (w.requestIdleCallback) w.cancelIdleCallback?.(idleId as number)
      else window.clearTimeout(idleId as number)
    }
  }, [])
  // Bumped by ContextGuard when a lost WebGL context fails to restore — forces
  // a full Canvas remount so the scene always recovers instead of staying blank.
  const [canvasEpoch, setCanvasEpoch] = useState(0)
  const remountCanvas = useCallback(() => setCanvasEpoch((e) => e + 1), [])
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
      {/* Leva controls stay wired (they still supply values) but the panel is
          always hidden — no editing UI in dev or production. */}
      <Leva hidden />
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
      {/* Cap DPR for performance — lower on low-power devices. Kept CONSTANT
          for the session: toggling dpr on isTransitioning reallocated every
          framebuffer at the heaviest animation moment (jank + context churn),
          and R3F gl options are init-only anyway so per-state gl flags were
          no-ops. */}
      {(() => {
        /* compute maxDpr in-place so JSX stays tidy */
        const maxDpr = typeof window !== 'undefined' ? (isLowPower ? 1 : Math.min(1.2, window.devicePixelRatio || 1)) : 1
        return (
          <Canvas
            // key: remounts the whole canvas if a lost WebGL context never
            // restores (see ContextGuard) — recovery from silent blank-outs.
            key={canvasEpoch}
            camera={{ position: [-0.09, -1.71, 1.19], fov: 38 }}
            // powerPreference 'default' (not 'high-performance'): on dual-GPU
            // machines forcing the discrete GPU both heats up fans and causes
            // context losses when the OS switches GPUs — the scene is cheap
            // enough now for the browser's own choice.
            gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
            // Capped DPR — keep visually sharp while cutting high-DPI cost.
            dpr={[1, maxDpr]}
            // Stop the render loop entirely while the tab is backgrounded, rather
            // than continuing to render an invisible canvas at full rate. Clock-
            // driven state (spin/float/backdrop time) simply resumes from where it
            // left off when the tab is visible again — no data/behavior change.
            frameloop={isPageVisible ? 'always' : 'never'}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: nav.adjust ? 50 : 5,
              pointerEvents: nav.adjust ? 'auto' : 'none',
            }}
          >
            {/* Theme scales the whole rig — "dark" halves the room's light. The
                switch is instantaneous; the ThemeFx flicker masks the jump. */}
            <ambientLight intensity={lights.ambient * themeLight} />
        <directionalLight position={[lights.keyPos.x, lights.keyPos.y, lights.keyPos.z]} intensity={lights.key * themeLight} />
        <directionalLight
          position={[lights.fillPos.x, lights.fillPos.y, lights.fillPos.z]}
          intensity={lights.fill * themeLight}
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
        <ContextGuard onNeedsRemount={remountCanvas} />
        {showBackdrop && <Backdrop />}
        {showDisc && <Record reducedMotion={reducedMotion} showText={showText} isTransitioning={isTransitioning} />}
        <PoseCapture poseRef={poseRef} />
          </Canvas>
        )
      })()}
    </>
  )
}
