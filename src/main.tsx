import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initErrorReporting } from './lib/errorReporting'
import { loadInitialTheme } from './store/themeStore'

// Apply the saved theme BEFORE first paint so there's no bright flash for
// earth/dark users (the CSS variables key off html[data-theme]).
document.documentElement.dataset.theme = loadInitialTheme()

// No-op unless this is a production build with VITE_SENTRY_DSN set.
initErrorReporting()

// No <StrictMode>: its dev-only double-mounting runs every effect twice —
// duplicate data fetches on each page load and, worse for this app, double
// WebGL work (canvas init, font/SDF warm-up). On context-limited GPUs that
// churn was evicting the 3D scene's WebGL context on nearly every load.
// Production builds are unaffected either way.
createRoot(document.getElementById('root')!).render(<App />)
