/**
 * Error reporting (Sentry) — fully optional and zero-cost when disabled.
 *
 * Activates ONLY in production builds AND when VITE_SENTRY_DSN is set (a host
 * env var on Cloudflare Pages — never committed). The SDK is dynamically
 * imported so it adds nothing to the initial bundle and is never even fetched
 * in dev or DSN-less deploys. Sentry's free Developer tier covers this app.
 */

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
const ENABLED = import.meta.env.PROD && !!DSN

type SentryModule = typeof import('@sentry/react')
let sentryPromise: Promise<SentryModule> | null = null

function loadSentry(): Promise<SentryModule> {
  sentryPromise ??= import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: DSN,
      // Errors only — no performance tracing/replay, keeping well inside the
      // free tier and sending no session data anywhere.
      tracesSampleRate: 0,
      // The WebGL context-loss path self-heals (ContextGuard); its warn logs
      // are expected noise, not errors, so nothing is captured for them.
    })
    return Sentry
  })
  return sentryPromise
}

/** Call once at startup. Hooks window.onerror / unhandledrejection via Sentry. */
export function initErrorReporting() {
  if (!ENABLED) return
  void loadSentry()
}

/** Report a caught error (e.g. from the ErrorBoundary). No-op when disabled. */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (!ENABLED) return
  void loadSentry().then((Sentry) => {
    Sentry.captureException(error, context ? { extra: context } : undefined)
  })
}
