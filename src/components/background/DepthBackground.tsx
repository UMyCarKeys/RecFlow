import { useEffect, useRef } from 'react'
import { useDepthStore } from '@/store/depthStore'

/**
 * Reactive depth background — a full-screen GLSL gradient world that:
 *  - continuously drifts (domain-warped fbm noise) for a living, breathing feel
 *  - parallaxes toward the mouse
 *  - zooms inward as the navigation depth increases (dashboard -> project -> track)
 *
 * Rendered with raw WebGL (single full-screen quad) so it stays extremely light
 * and never competes with the React Three Fiber vinyl canvas.
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
uniform float u_depth;   // smoothed 0..2

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

  // Deeper navigation zooms into the field
  float zoom = 1.0 + u_depth * 0.55;
  p = (p - 0.5 * vec2(aspect, 1.0)) * zoom + 0.5 * vec2(aspect, 1.0);

  float t = u_time * 0.035;
  vec2 mouseOff = u_mouse * 0.12;

  // Domain warping for organic, flowing color movement
  vec2 q = vec2(fbm(p + vec2(0.0, t) + mouseOff),
                fbm(p + vec2(5.2, -t) + mouseOff));
  vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + t * 0.5),
                fbm(p + 2.0 * q + vec2(8.3, 2.8) - t * 0.5));
  float f = fbm(p + 2.5 * r);

  // Warm Spectrum palette
  vec3 base   = vec3(0.102, 0.086, 0.125); // #1a1620
  vec3 coral  = vec3(1.0,   0.541, 0.42);  // #ff8a6b
  vec3 amber  = vec3(1.0,   0.769, 0.42);  // #ffc46b
  vec3 rose   = vec3(1.0,   0.42,  0.616); // #ff6b9d
  vec3 violet = vec3(0.722, 0.549, 1.0);   // #b88cff

  vec3 col = base;
  col = mix(col, rose,   smoothstep(0.0, 0.9, f)   * 0.55);
  col = mix(col, coral,  smoothstep(0.2, 1.0, r.x) * 0.50);
  col = mix(col, amber,  smoothstep(0.3, 1.0, q.y) * 0.32);
  col = mix(col, violet, smoothstep(0.4, 1.0, r.y) * 0.42);

  // Keep it washed / semi-dark: pull toward base in the low areas
  col = mix(base, col, smoothstep(0.05, 0.8, f + 0.2));

  // Vignette toward the edges so content stays readable
  float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
  col *= mix(0.62, 1.0, vig);

  // Subtle film grain
  float g = hash(gl_FragCoord.xy + fract(u_time));
  col += (g - 0.5) * 0.022;

  gl_FragColor = vec4(col, 1.0);
}
`

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

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const targetMouse = { x: 0, y: 0 }
    const curMouse = { x: 0, y: 0 }
    let curDepth = 0
    const onMove = (e: MouseEvent) => {
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1
      targetMouse.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMove)

    const start = performance.now()
    let raf = 0
    const frame = () => {
      const time = (performance.now() - start) / 1000
      curMouse.x += (targetMouse.x - curMouse.x) * 0.045
      curMouse.y += (targetMouse.y - curMouse.y) * 0.045
      curDepth += (useDepthStore.getState().depth - curDepth) * 0.06

      gl.uniform1f(uTime, time)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform2f(uMouse, curMouse.x, curMouse.y)
      gl.uniform1f(uDepth, curDepth)
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
    <canvas
      ref={canvasRef}
      id="depth-background"
      className="fixed inset-0 pointer-events-none"
      style={{ width: '100vw', height: '100vh', zIndex: 0 }}
    />
  )
}
