import { useEffect, useRef } from 'react'
import { useDepthStore } from '@/store/depthStore'

/**
 * Reactive depth background — a heavily frosted, vivid gradient world.
 *
 * The shader renders a vivid, drifting color field; it is then rendered at low
 * internal resolution and pushed through a large CSS blur so the colors read as
 * glowing light behind frosted glass. A crisp SVG grain overlay sits on top for
 * texture. The field:
 *  - breathes continuously (domain-warped fbm noise)
 *  - parallaxes very gently toward the mouse (low sensitivity)
 *  - zooms on navigation depth, with an ease-in-out (ramp up / taper out) tween
 */

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;   // -1..1
uniform float u_depth;   // eased 0..2

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = uv;
  p.x *= aspect;

  // Inverted depth zoom: navigating deeper enlarges the field (dive-in feel).
  // Eased in JS, so this ramps up then tapers off during transitions.
  float zoom = 1.0 - u_depth * 0.16;
  vec2 center = 0.5 * vec2(aspect, 1.0);
  p = (p - center) * zoom + center;

  float t = u_time * 0.035;
  vec2 mouseOff = u_mouse * 0.08; // mouse parallax sensitivity

  // Domain warping for organic, flowing color movement
  vec2 q = vec2(fbm(p + vec2(0.0, t) + mouseOff),
                fbm(p + vec2(5.2, -t) + mouseOff));
  vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + t * 0.5),
                fbm(p + 2.0 * q + vec2(8.3, 2.8) - t * 0.5));
  float f = fbm(p + 2.5 * r);

  // Warm Spectrum palette (vivid)
  vec3 base   = vec3(0.102, 0.086, 0.125); // #1a1620
  vec3 coral  = vec3(1.0,   0.541, 0.42);  // #ff8a6b
  vec3 amber  = vec3(1.0,   0.769, 0.42);  // #ffc46b
  vec3 rose   = vec3(1.0,   0.42,  0.616); // #ff6b9d
  vec3 violet = vec3(0.722, 0.549, 1.0);   // #b88cff

  vec3 col = base;
  col = mix(col, rose,   smoothstep(0.0, 0.85, f)  * 0.6);
  col = mix(col, coral,  smoothstep(0.15, 1.0, r.x) * 0.56);
  col = mix(col, amber,  smoothstep(0.25, 1.0, q.y) * 0.42);
  col = mix(col, violet, smoothstep(0.35, 1.0, r.y) * 0.5);

  // Keep it washed / semi-dark in the low areas
  col = mix(base, col, smoothstep(0.02, 0.78, f + 0.22));

  // Gentle saturation lift (kept modest so the background stays muted)
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.25);
  col = clamp(col, 0.0, 1.0);

  // Subtle neon streak accents
  float streak = smoothstep(0.96, 1.0, fbm(p * vec2(0.6, 2.6) + vec2(t * 2.2, 0.0)));
  col += streak * vec3(1.0, 0.45, 0.85) * 0.35;

  // Sparkle grain — faint twinkling points (soft glints after blur)
  vec2 sgrid = gl_FragCoord.xy / 2.5;
  float sp = hash(floor(sgrid));
  float tw = sin(u_time * 3.2 + sp * 120.0) * 0.5 + 0.5;
  float sparkle = smoothstep(0.984, 1.0, sp) * tw;
  col += sparkle * vec3(1.0, 0.92, 0.82) * 0.6;

  // Vignette toward the edges
  float vig = smoothstep(1.3, 0.3, length(uv - 0.5));
  col *= mix(0.6, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`

// Render small (cheap) and blur heavily for the frosted look.
const RENDER_SCALE = 0.5
const OVERSIZE = 1.14 // canvas extends past the viewport so blur edges aren't visible

function smootherstep(x: number) {
  x = Math.min(1, Math.max(0, x))
  return x * x * x * (x * (x * 6 - 15) + 10)
}

export function DepthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
    if (!gl) return

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('[DepthBackground] shader error:', gl.getShaderInfoLog(s))
      }
      return s
    }

    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const posLoc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(program, 'u_time')
    const uRes = gl.getUniformLocation(program, 'u_resolution')
    const uMouse = gl.getUniformLocation(program, 'u_mouse')
    const uDepth = gl.getUniformLocation(program, 'u_depth')

    const resize = () => {
      const w = window.innerWidth * OVERSIZE
      const h = window.innerHeight * OVERSIZE
      canvas.width = Math.floor(w * RENDER_SCALE)
      canvas.height = Math.floor(h * RENDER_SCALE)
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const targetMouse = { x: 0, y: 0 }
    const curMouse = { x: 0, y: 0 }
    const onMove = (e: MouseEvent) => {
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1
      targetMouse.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMove)

    // Eased depth transition (ramp up / taper out)
    const DURATION = 0.95
    let displayDepth = useDepthStore.getState().depth
    let fromDepth = displayDepth
    let toDepth = displayDepth
    let tweenStart = 0

    const start = performance.now()
    let raf = 0
    const frame = () => {
      const time = (performance.now() - start) / 1000

      // Gentle mouse follow
      curMouse.x += (targetMouse.x - curMouse.x) * 0.03
      curMouse.y += (targetMouse.y - curMouse.y) * 0.03

      const target = useDepthStore.getState().depth
      if (target !== toDepth) {
        fromDepth = displayDepth
        toDepth = target
        tweenStart = time
      }
      const prog = (time - tweenStart) / DURATION
      displayDepth = fromDepth + (toDepth - fromDepth) * smootherstep(prog)

      gl.uniform1f(uTime, time)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform2f(uMouse, curMouse.x, curMouse.y)
      gl.uniform1f(uDepth, displayDepth)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      raf = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
    }
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        id="depth-background"
        className="fixed pointer-events-none"
        style={{
          left: '-7vw',
          top: '-7vh',
          zIndex: 0,
          filter: 'blur(54px) saturate(1.14) brightness(0.9)',
        }}
      />
      {/* Crisp frosted grain texture on top of the blurred color glow */}
      <div
        id="depth-grain"
        className="fixed inset-0 pointer-events-none mix-blend-soft-light opacity-[0.13]"
        style={{
          zIndex: 0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px',
        }}
      />
    </>
  )
}
