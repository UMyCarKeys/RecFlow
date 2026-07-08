# Release checklist

Run through this top-to-bottom before every production deploy. Nothing ships
while a **Blocker** is open; "ship-with" issues get a tracked ticket.

## 1. Code state
- [ ] `main` is green in CI (typecheck + build)
- [ ] No debug/experimental routes or panels reachable in the build
- [ ] `npm run build && npm run preview` — click through the app served from
      `dist/`, not the dev server (dev-only behavior differs)

## 2. Database (Supabase)
- [ ] All files in `supabase/migrations/` applied to the **production** project,
      in order (SQL editor or `supabase db push`)
- [ ] New tables have RLS enabled + policies (check the Supabase dashboard's
      linter warnings)
- [ ] Storage policy check: a non-owner account cannot modify another
      project's cover (migration 012)

## 3. Environment
- [ ] Prod build points at the **production** Supabase project
      (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` on the host, never
      committed)
- [ ] `VITE_SENTRY_DSN` set in the host's BUILD environment (Vite bakes env at
      build time) — error reporting silently stays off without it
- [ ] Staging/dev use a separate Supabase project so QA can't touch real data
- [ ] Supabase Auth → URL configuration lists the production domain
      (redirects break silently otherwise)

## 4. Hosting / headers
- [ ] CSP allows: Supabase origin (`connect-src`), blob workers
      (`worker-src blob:`), and inline/module needs of the build — verify the
      3D scene renders and audio plays on the DEPLOYED url, desktop + mobile
      Safari (CSP has broken both before; 3D text font is bundled locally so
      no CDN allowance is needed)
- [ ] SPA fallback: all routes rewrite to `/index.html` (deep links + refresh)

## 5. Smoke test (staging, then prod — ~5 minutes)
- [ ] Sign up fresh account → land on dashboard
- [ ] Create project → appears immediately → click card → sleeve transition
      plays clean (no flash, no context loss)
- [ ] Empty project: "No active tracks" text fades in on the record
- [ ] Add track → arc appears; hover glow + click drills into track
- [ ] Upload cover → tile + vinyl center update
- [ ] Archive project → hidden from dashboard; restore works
- [ ] Second account (non-member): cannot see or modify the first account's
      projects
- [ ] Sign out / sign back in
- [ ] Mobile Safari: background renders, disc renders, no horizontal scroll

## 6. After deploy
- [ ] Watch the browser console on prod for the first session (errors, CSP
      violations, `[SleeveTransition] handshake never completed` warnings)
- [ ] Know the rollback: redeploy the previous build from the host's dashboard
- [ ] Tag the release: `git tag vX.Y.Z && git push --tags`
