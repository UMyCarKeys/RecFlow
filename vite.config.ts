import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    // Pinned to a concrete baseline instead of 'esnext' so output gets safe
    // downleveling for older-but-still-common browsers (older Safari/iOS,
    // older Android WebViews) rather than emitting whatever syntax the
    // source/deps use natively with no minimum-version guarantee. Purely a
    // compile-output change — no runtime logic, data flow, or behavior is
    // affected.
    // safari15/firefox90/chrome91 are the versions that added native public
    // class fields — staying at/above that avoids esbuild injecting a
    // shared `_defineProperty` downleveling helper for class fields, which
    // otherwise gets physically placed wherever Rollup's chunking decides,
    // occasionally inside an unrelated lazy-loaded vendor chunk and
    // dragging its whole contents into the eager load path.
    target: ['es2020', 'safari15', 'chrome91', 'firefox90', 'edge91'],
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React/zustand are used both eagerly (every route's stores) and
          // inside the lazy-loaded 3D scene (VinylScene uses useDepthStore).
          // Without an explicit chunk, Rollup can end up physically placing
          // their shared CJS-interop shims inside whichever named vendor
          // chunk it processes them alongside — which for a while meant a
          // handful of bindings from 'three-vendor' were referenced by the
          // eagerly-loaded entry, forcing the whole ~1MB three.js chunk to
          // be fetched on every page (including /login, /register) even
          // though nothing there uses three.js. Chunking these foundational,
          // truly-shared packages explicitly keeps them out of three-vendor.
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/') || id.includes('/node_modules/zustand/')) return 'react-vendor'
          // @babel/runtime helpers (e.g. defineProperty) are a genuinely
          // shared module used by both @supabase/supabase-js (eager) and
          // @react-three/drei / leva (lazy) — without its own chunk, Rollup
          // co-locates it inside whichever named chunk it processes first,
          // which was dragging the whole three-vendor chunk into the eager
          // load path for the sake of one tiny shared helper function.
          if (id.includes('@babel/runtime')) return 'shared-helpers'
          if (id.includes('three') || id.includes('@react-three') || id.includes('/leva/') || id.includes('@theatre')) return 'three-vendor'
          if (id.includes('wavesurfer')) return 'audio-vendor'
          if (id.includes('@supabase')) return 'supabase'
        },
      },
    },
  },
})
