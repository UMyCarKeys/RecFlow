import type { Track, TrackStage } from '@/types/database'

/**
 * Client-side demo content shown to new users who have no projects yet — purely
 * illustrative placeholder data so they can see how RecFlow works before
 * creating or joining a real project. Nothing here touches the database.
 */

export interface DemoVersion {
  id: string
  version_number: number
  description: string
  tags: string[]
  variant?: string
  uploader: string
  at: string
}

export interface DemoComment {
  id: string
  author: string
  body: string
  timestamp_s?: number
  at: string
  task?: { title: string; assignee: string; done: boolean }
}

export interface DemoIdea {
  text: string
  label: string
  url: string
}

export interface DemoTrack {
  id: string
  title: string
  stage: TrackStage
  versions: DemoVersion[]
  comments: DemoComment[]
  ideas: DemoIdea[]
}

export const DEMO_PROJECT_NAME = 'Demo'

export const DEMO_TRACKS: DemoTrack[] = [
  {
    id: 'demo-t1',
    title: 'Midnight Drive',
    stage: 'mix',
    versions: [
      { id: 'demo-v3', version_number: 3, description: 'Brighter chorus, tightened low end', tags: ['rough-mix'], variant: 'Warm take', uploader: 'jordan', at: '2026-06-26T18:00:00Z' },
      { id: 'demo-v2', version_number: 2, description: 'Heavier drums, darker tone', tags: ['vocal'], variant: 'Aggressive take', uploader: 'sam', at: '2026-06-24T12:00:00Z' },
      { id: 'demo-v1', version_number: 1, description: 'First full band pass', tags: [], uploader: 'jordan', at: '2026-06-22T09:00:00Z' },
    ],
    comments: [
      { id: 'demo-c1', author: 'sam', body: 'The bridge hits so hard here 🔥', timestamp_s: 94, at: '2026-06-26T19:10:00Z', task: { title: 'Re-balance the bridge vocal', assignee: 'jordan', done: false } },
      { id: 'demo-c2', author: 'jordan', body: 'Agreed — let me try riding the fader on the second chorus.', at: '2026-06-26T19:25:00Z' },
    ],
    ideas: [],
  },
  {
    id: 'demo-t2',
    title: 'Paper Planes',
    stage: 'idea',
    versions: [],
    comments: [],
    ideas: [
      { text: 'Lo-fi shuffle with a dusty rhodes — keep it intimate.', label: 'Reference groove', url: 'https://example.com/groove' },
      { text: 'Lyric seed: "we fold the day into something we can throw."', label: 'Mood board', url: 'https://example.com/mood' },
    ],
  },
  {
    id: 'demo-t3',
    title: 'Afterglow',
    stage: 'master',
    versions: [
      { id: 'demo-v3b', version_number: 4, description: 'Final master — +0.8 LUFS, gentle de-ess', tags: ['master'], uploader: 'mia', at: '2026-06-27T15:00:00Z' },
      { id: 'demo-v2b', version_number: 3, description: 'Mastering candidate', tags: [], uploader: 'mia', at: '2026-06-25T11:00:00Z' },
    ],
    comments: [
      { id: 'demo-c3', author: 'mia', body: 'This is the one. Shipping it.', at: '2026-06-27T15:30:00Z', task: { title: 'Export 24-bit WAV for distribution', assignee: 'mia', done: true } },
    ],
    ideas: [],
  },
  {
    id: 'demo-t4',
    title: 'Lower Tides',
    stage: 'demo',
    versions: [
      { id: 'demo-v4', version_number: 2, description: 'Phone voice memo + guitar', tags: ['rough'], uploader: 'jordan', at: '2026-06-23T20:00:00Z' },
      { id: 'demo-v4a', version_number: 1, description: 'Hummed melody idea', tags: [], uploader: 'jordan', at: '2026-06-21T08:00:00Z' },
    ],
    comments: [
      { id: 'demo-c4', author: 'sam', body: 'Love the melody at 0:30 — could be the hook.', timestamp_s: 30, at: '2026-06-23T21:00:00Z' },
    ],
    ideas: [],
  },
]

/** Minimal Track-shaped objects so the demo can feed the real VinylRecord. */
export const DEMO_RECORD_TRACKS: Track[] = DEMO_TRACKS.map((t) => ({
  id: t.id,
  project_id: 'demo',
  title: t.title,
  position: 0,
  created_by: 'demo',
  created_at: '',
  updated_at: '',
  stage: t.stage,
  notes: null,
  links: [],
  archived: false,
  title_history: [],
}))
