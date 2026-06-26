# RecFlow

Collaborative album versioning and project management for music teams. Upload tracks, leave timestamped comments, assign tasks, and hear updates live — all in the browser.

## Stack

- **Frontend**: Vite 5 + React 18 + TypeScript
- **3D UI**: @react-three/fiber + @react-three/drei (vinyl disc interface)
- **Styling**: Tailwind CSS v3 + Framer Motion
- **Audio**: wavesurfer.js v7 (in-browser playback only, no download)
- **State**: Zustand
- **Backend**: Supabase (auth, database, realtime)
- **Storage**: Cloudflare R2 (private bucket, signed URLs)
- **Hosting**: Cloudflare Pages

## Setup

1. Create a Supabase project and run the migrations in `supabase/migrations/` in order
2. Create a private Cloudflare R2 bucket
3. Deploy the edge functions in `supabase/functions/` with your R2 credentials as secrets
4. Copy `.env.example` to `.env` and fill in your Supabase URL and anon key
5. Install dependencies and run:

```bash
npm install
npm run dev
```

## Environment Variables

See `.env.example`. R2 credentials belong only in Supabase Edge Function secrets — never in `.env`.

## Deploy

```bash
npm run build
npx wrangler pages deploy dist
```

## Audio Architecture

Audio files are stored in a private R2 bucket. Playback goes through a Supabase Edge Function that verifies project membership and returns a short-lived signed URL. The client fetches that URL as a blob and passes it to WaveSurfer — the signed URL never touches the browser's network tab as a navigable link.
