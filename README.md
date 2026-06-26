# RecFlow

A collaborative music album project management app built for small creative teams. Upload audio versions of your tracks, leave timestamped comments, assign tasks, and hear updates live — all inside the browser. Designed around a dark, washed aesthetic with 3D reflective vinyl discs as the playback interface.

---

## What It Does

RecFlow gives music collaborators a shared workspace for every track in an album project:

- **Version tracking** — upload new mixes or takes of any track. Each upload auto-increments a version number per track (v1, v2, v3…). Describe what changed and tag it (e.g. `rough-mix`, `vocal`, `bridge-rework`).
- **In-browser playback only** — audio streams through a private Cloudflare R2 bucket via short-lived signed URLs. Files are never exposed as downloadable links in the browser — not in the network tab, not via right-click.
- **Timestamped comments** — leave feedback at a specific point in the track. Click a timestamp chip in any comment to seek the player directly to that moment.
- **Threaded discussion** — reply to any comment to keep conversations organized per version.
- **Task management** — create action items on any version (e.g. "re-record bridge", "fix the low end"). Assign tasks to team members, track status (`open → in progress → done`).
- **Live updates** — when a collaborator uploads a new version, everyone on the track page sees a toast notification in real time via Supabase Realtime.
- **3D vinyl disc interface** — each track in a project renders as a reflective spinning vinyl disc. Click a disc to load that track's latest version into the player.

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| [Vite](https://vitejs.dev/) | 5 | Build tool and dev server |
| [React](https://react.dev/) | 18 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 6 | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | v3 | Utility-first styling |
| [Framer Motion](https://www.framer.com/motion/) | 12 | Page transitions and animations |
| [React Router](https://reactrouter.com/) | v7 | Client-side routing |
| [Zustand](https://zustand-demo.pmnd.rs/) | v5 | Global state (player, UI modals, toasts) |

### 3D Rendering

| Technology | Purpose |
|---|---|
| [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) | React renderer for Three.js |
| [@react-three/drei](https://drei.docs.pmnd.rs/) | Helpers: Environment, OrbitControls |
| [Three.js](https://threejs.org/) | 3D engine |

The vinyl disc is a `CylinderGeometry` mesh with `MeshStandardMaterial` at `metalness: 0.9, roughness: 0.05`. Groove detail is a procedural normal map generated via the browser Canvas API (concentric ring strokes). A studio HDR environment map (`<Environment preset="studio" />`) provides realistic reflections without a separate `.hdr` file. All track discs render in a single `<Canvas>` — not one canvas per disc — for performance. The active disc spins at 33.33 RPM via `useFrame`.

### Audio

| Technology | Purpose |
|---|---|
| [wavesurfer.js](https://wavesurfer.js.org/) | Waveform rendering and playback |

Audio is loaded into WaveSurfer as a `blob://` URL, never as a raw signed URL. The signed URL is consumed server-side and never appears in the browser's network inspector as a navigable link.

### Backend & Infrastructure

| Service | Purpose |
|---|---|
| [Supabase](https://supabase.com/) | PostgreSQL database, Auth, Realtime subscriptions |
| [Cloudflare R2](https://developers.cloudflare.com/r2/) | Private audio file storage (no egress fees) |
| [Supabase Edge Functions](https://supabase.com/docs/guides/functions) | Signs R2 URLs server-side — R2 credentials never reach the browser |
| [Cloudflare Pages](https://pages.cloudflare.com/) | Static hosting with SPA routing |

---

## Database Schema

All tables live in Supabase Postgres with Row Level Security enabled.

```
profiles         — extends auth.users 1:1; auto-created on signup via trigger
projects         — album workspaces; owned by a profile
project_members  — role: owner | contributor | viewer
tracks           — songs within a project; ordered by position
versions         — each uploaded take; stores the R2 object key (never a URL)
                   version_number is auto-incremented per track via DB trigger
comments         — on versions; parent_id enables threading; timestamp_s anchors to playback
tasks            — action items on versions; status: open | in_progress | done
```

RLS policies use three `SECURITY DEFINER` helper functions (`is_project_member`, `is_project_contributor`, `is_project_owner`) to avoid recursive join issues in nested-table policies.

---

## Audio Security Architecture

Preventing casual audio downloading requires three layers working together:

1. **Private R2 bucket** — no public access. Every play requires a fresh signed URL.
2. **Edge Function `get-audio-url`** — verifies the caller is a project member via RLS, then generates a 15-minute presigned GET URL using `aws4fetch`. R2 credentials exist only as Edge Function secrets and never touch the browser.
3. **Client-side blob conversion** — the signed URL is fetched server-to-server inside the Edge Function. The client receives the URL, fetches it as a `Blob`, creates a `blob://` object URL via `URL.createObjectURL()`, passes it to WaveSurfer, then immediately calls `URL.revokeObjectURL()` after WaveSurfer decodes it into Web Audio buffers.
4. **Custom player only** — no native `<audio controls>`, no download button, `onContextMenu` is prevented on all player elements.

> **Note:** This defeats casual downloading. A determined user with DevTools open can still capture audio via Web Audio API sniffing — that is the ceiling of what's possible in any browser-based player.

---

## Project Structure

```
RecFlow/
├── public/
│   └── _headers                  ← Cloudflare Pages CSP and security headers
├── src/
│   ├── lib/
│   │   ├── supabase.ts           ← Supabase client singleton
│   │   ├── r2.ts                 ← fetchAudioBlob() and getUploadUrl()
│   │   └── utils.ts              ← cn(), formatDuration(), timeAgo(), formatBytes()
│   ├── types/
│   │   └── database.ts           ← TypeScript types for all DB tables
│   ├── store/
│   │   ├── playerStore.ts        ← Zustand: activeVersionId, blobUrl, isPlaying, progress
│   │   └── uiStore.ts            ← Zustand: modal state, toast notifications
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProject.ts
│   │   ├── useTrack.ts
│   │   ├── useVersions.ts
│   │   ├── useComments.ts
│   │   ├── useTasks.ts
│   │   └── useRealtimeVersions.ts ← Supabase Realtime subscription for live version updates
│   ├── components/
│   │   ├── ui/                   ← Button, Modal, Tag, Avatar, Spinner, Toast
│   │   ├── layout/               ← AppShell, Sidebar, PlayerBar (persistent bottom bar)
│   │   ├── player/               ← AudioPlayer (WaveSurfer), PlayerControls
│   │   ├── disc/                 ← DiscScene (R3F Canvas), VinylDisc (3D mesh)
│   │   ├── project/              ← ProjectCard, CreateProjectModal
│   │   ├── track/                ← VersionCard, UploadVersionModal
│   │   ├── comments/             ← CommentThread, CommentItem, CommentComposer
│   │   └── tasks/                ← TaskList, TaskItem, TaskComposer
│   └── pages/
│       ├── LoginPage.tsx
│       ├── RegisterPage.tsx
│       ├── DashboardPage.tsx     ← / (project grid)
│       ├── ProjectPage.tsx       ← /project/:id (3D disc grid)
│       └── TrackPage.tsx         ← /project/:id/track/:trackId
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql        ← All tables, indexes, triggers
│   │   ├── 002_rls.sql           ← Row Level Security policies
│   │   └── 003_realtime.sql      ← Enable Realtime on versions, comments, tasks
│   └── functions/
│       ├── get-audio-url/        ← Signs R2 GET URL (15 min TTL)
│       └── get-upload-url/       ← Signs R2 PUT URL for direct browser upload (5 min TTL)
└── wrangler.toml                 ← Cloudflare Pages config
```

---

## Setup Guide

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- A [Supabase](https://supabase.com/) account (free tier works)
- A [Cloudflare](https://cloudflare.com/) account (free tier works)
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `npm install -g supabase`
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) — included as a dev dependency

---

### 1. Clone and install

```bash
git clone https://github.com/UMyCarKeys/RecFlow.git
cd RecFlow
npm install
```

---

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com/) → New project
2. Once created, go to **Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`
3. Create your `.env` file:

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

---

### 3. Run the database migrations

In the Supabase dashboard, go to **SQL Editor** and run each migration file in order:

1. `supabase/migrations/001_schema.sql` — creates all tables and triggers
2. `supabase/migrations/002_rls.sql` — enables Row Level Security
3. `supabase/migrations/003_realtime.sql` — enables live updates

Or link the project with the CLI and push migrations:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

---

### 4. Create a Cloudflare R2 bucket

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/) → **R2**
2. Create a bucket named `recflow-audio` (or your preferred name)
3. Keep it **private** — do not enable public access
4. Go to **R2 → Manage R2 API Tokens** → create a token with **Object Read & Write** on your bucket
5. Note the **Access Key ID**, **Secret Access Key**, and your **Account ID**

Set the R2 CORS rule on the bucket to allow your site to upload directly:

```json
[
  {
    "AllowedOrigins": ["https://your-site.pages.dev"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

---

### 5. Deploy the Edge Functions

```bash
supabase functions deploy get-audio-url
supabase functions deploy get-upload-url
```

Set the required secrets (these never go in `.env`):

```bash
supabase secrets set R2_ACCESS_KEY_ID=your_key
supabase secrets set R2_SECRET_ACCESS_KEY=your_secret
supabase secrets set R2_BUCKET_NAME=recflow-audio
supabase secrets set R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
supabase secrets set SITE_URL=https://your-site.pages.dev
```

---

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Register an account — a profile row is auto-created. Create a project, add tracks, and upload audio.

---

### 7. Deploy to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Cloudflare Pages dashboard under **Settings → Environment variables**.

---

## How to Use

### Creating a project

From the dashboard, click **New project**. Give it a name (your album title) and an optional description. You'll be taken to the project's disc view.

### Adding tracks

Inside a project, click **+ Add track** and enter the track title. A new vinyl disc appears in the grid for that track.

### Uploading a version

Click on a disc or navigate to a track, then click **Upload version**. Drop in an MP3, WAV, AIFF, or FLAC file. Add a description of what changed and any tags, then submit. The file uploads directly to R2 via a short-lived signed URL — it never passes through the server. All collaborators on the track see a live notification when the upload completes.

### Playing audio

Click the play button on any version card, or click a vinyl disc in the project view. The persistent player bar at the bottom controls playback. The active disc spins at 33.33 RPM while playing.

### Leaving a comment

While a version is playing, check **Pin to [timestamp]** in the comment box to anchor your feedback to that exact moment. Others can click the timestamp chip to jump to that point.

### Managing tasks

On any version, use the **Tasks** panel to create action items. Assign them to project members and advance the status by clicking the status badge (`Open → In progress → Done`).

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| `surface` | `#0d0d0f` | Page background |
| `surface-1` | `#141417` | Sidebar, player bar |
| `surface-2` | `#1c1c21` | Cards, modals |
| `surface-3` | `#252529` | Inputs, hover states |
| `accent` | `#7c6af0` | Primary actions, active states |
| `accent-hover` | `#9b8ef5` | Hover on accent elements |
| `muted` | `#6b6b7a` | Secondary text, placeholders |

---

## Free Tier Limits

| Service | Free limit | Expected usage |
|---|---|---|
| Cloudflare Pages | Unlimited requests | Fine for any team size |
| Cloudflare R2 | 10 GB storage, free egress | ~200 MB for 20 MP3s |
| Supabase DB | 500 MB | ~50 MB for metadata |
| Supabase Realtime | 2M messages/month | ~50K/month for 25 users |
| Supabase Edge Functions | 500K invocations/month | ~5K/month typical usage |
| Supabase Auth | 50K MAU | 25 users |

> **Heads up:** Supabase free projects pause after 7 days of inactivity. Set up a Cloudflare Worker cron (free tier) that pings your Supabase URL every 5 days to keep it awake.
