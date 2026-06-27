# RecFlow

RecFlow is a collaborative music production workspace for small teams. It tracks every track in an album from the first idea to the final master — keeping versions, feedback, and tasks organized in one place.

---

## The Workflow

Every track moves through five stages. The stage is visible at the top of the track page and can be updated at any time.

```
Idea → Demo → Mix → Final Mix → Master
```

| Stage | What it's for |
|---|---|
| **Idea** | Capture the concept. Write notes, paste reference links (songs, videos, articles). Nothing uploaded yet. |
| **Demo** | First rough recordings — a voice memo, a scratch vocal, an instrumental sketch. Upload MP3s or WAVs. |
| **Mix** | Multiple mix versions as the track takes shape. Each upload is versioned (v1, v2, v3…) so nothing is lost. |
| **Final Mix** | Near-complete. The arrangement is locked, levels are dialed — waiting for final touches, transitions, or effects. |
| **Master** | Mixed and mastered. Complete. |

---

## What You Can Do on Each Track

**Upload versions** — drop in an MP3, WAV, AIFF, or FLAC at any stage. Each upload auto-increments a version number and stores the file privately in Cloudflare R2.

**Leave timestamped comments** — while a version plays, pin your feedback to the exact moment you're hearing. Click a timestamp chip to jump back to that point.

**Create tasks** — "re-record the bridge", "fix low end at 2:14". Assign to a team member, track status (`open → in progress → done`).

**Get live updates** — when someone uploads a new version, everyone on the track sees a toast notification in real time.

**Idea board** — when a track is in the Idea stage, a notes area and reference links panel appear. Jot down lyrics, concepts, and links to inspiration before any recording happens.

---

## The Interface

The project view renders each track as a **3D reflective vinyl disc**. The active disc spins at 33.33 RPM. A persistent player bar sits at the bottom of every page.

Audio streams through signed URLs from a private R2 bucket — files are never exposed as downloadable links in the network tab.

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| Vite + React + TypeScript | Build tooling and UI |
| Tailwind CSS | Utility-first styling |
| Framer Motion | Page transitions and animations |
| React Router v7 | Client-side routing |
| Zustand | Global state (player, modals, toasts) |

### 3D

| Technology | Purpose |
|---|---|
| @react-three/fiber | React renderer for Three.js |
| @react-three/drei | Environment, OrbitControls helpers |
| Three.js | 3D engine |

The vinyl disc is a `CylinderGeometry` with `MeshStandardMaterial` (metalness 0.9, roughness 0.05) and a procedural groove normal map generated via the Canvas API. All discs render in a single `<Canvas>` for performance.

### Audio

WaveSurfer.js renders the waveform. Audio is loaded as a `blob://` URL — the signed R2 URL is consumed by a fetch call and the raw URL never appears in the browser as a navigable link.

### Backend

| Service | Purpose |
|---|---|
| Supabase | PostgreSQL, Auth, Realtime subscriptions |
| Cloudflare R2 | Private audio storage (no egress fees) |
| Supabase Edge Functions | Signs R2 URLs server-side — credentials never reach the browser |
| Cloudflare Pages | Static hosting |

---

## Database Schema

```
profiles         — extends auth.users 1:1; auto-created on signup via trigger
projects         — album workspaces; owned by a profile
project_members  — role: owner | contributor | viewer
tracks           — songs within a project; ordered by position
                   stage: idea | demo | mix | final_mix | master
                   notes + links stored per track for the idea stage
versions         — each uploaded take; version_number auto-incremented per track
comments         — on versions; parent_id enables threading; timestamp_s anchors to playback
tasks            — action items on versions; status: open | in_progress | done
```

Row Level Security is enabled on all tables. Three `SECURITY DEFINER` helper functions (`is_project_member`, `is_project_contributor`, `is_project_owner`) keep nested-table policies clean.

---

## Setup Guide

### Prerequisites

- Node.js 20+
- [Supabase](https://supabase.com/) account (free tier works)
- [Cloudflare](https://cloudflare.com/) account (free tier works)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

---

### 1. Clone and install

```bash
git clone https://github.com/UMyCarKeys/RecFlow.git
cd RecFlow
npm install
```

---

### 2. Supabase project

1. Go to [supabase.com](https://supabase.com/) → New project
2. Go to **Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

---

### 3. Run migrations

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

This applies all migrations in `supabase/migrations/` in order.

---

### 4. Cloudflare R2 bucket

1. Cloudflare Dashboard → **R2** → Create bucket named `recflow-audio`
2. Keep it **private**
3. Create an R2 API token with **Object Read & Write**
4. Set the CORS rule on the bucket:

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

### 5. Deploy Edge Functions

```bash
supabase functions deploy get-audio-url
supabase functions deploy get-upload-url
```

Set secrets (never go in `.env`):

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

Open [http://localhost:5173](http://localhost:5173). Register, create a project, add tracks, upload audio.

---

### 7. Deploy

```bash
npm run build
npx wrangler pages deploy dist
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Cloudflare Pages → **Settings → Environment variables**.

---

## Project Structure

```
src/
├── components/
│   ├── disc/        ← 3D vinyl disc (DiscScene, VinylDisc)
│   ├── track/       ← VersionCard, UploadVersionModal, StageProgress, IdeaBoard
│   ├── comments/    ← CommentThread, CommentItem, CommentComposer
│   ├── tasks/       ← TaskList, TaskItem, TaskComposer
│   ├── project/     ← ProjectCard, CreateProjectModal
│   ├── player/      ← AudioPlayer (WaveSurfer), PlayerControls
│   ├── layout/      ← AppShell, Sidebar, PlayerBar
│   └── ui/          ← Button, Modal, Tag, Avatar, Spinner, Toast
├── pages/           ← Dashboard, Project (disc grid), Track (versions + comments + tasks)
├── hooks/           ← useAuth, useProject, useTrack, useVersions, useComments, useTasks
├── store/           ← playerStore (Zustand), uiStore (Zustand)
├── types/           ← database.ts (all TypeScript types)
└── lib/             ← supabase.ts, r2.ts, utils.ts
supabase/
├── migrations/      ← 001 schema, 002 RLS, 003 realtime, 004 track stages
└── functions/       ← get-audio-url, get-upload-url
```

---

## Free Tier Limits

| Service | Free limit | Expected usage |
|---|---|---|
| Cloudflare Pages | Unlimited requests | Fine for any team |
| Cloudflare R2 | 10 GB storage, free egress | ~200 MB for 20 MP3s |
| Supabase DB | 500 MB | ~50 MB for metadata |
| Supabase Realtime | 2M messages/month | ~50K/month for 25 users |
| Supabase Edge Functions | 500K invocations/month | ~5K/month typical |
| Supabase Auth | 50K MAU | 25 users |

> Supabase free projects pause after 7 days of inactivity. A Cloudflare Worker cron pinging your project URL every 5 days keeps it awake.
