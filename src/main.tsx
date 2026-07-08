import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// No <StrictMode>: its dev-only double-mounting runs every effect twice —
// duplicate data fetches on each page load and, worse for this app, double
// WebGL work (canvas init, font/SDF warm-up). On context-limited GPUs that
// churn was evicting the 3D scene's WebGL context on nearly every load.
// Production builds are unaffected either way.
createRoot(document.getElementById('root')!).render(<App />)
