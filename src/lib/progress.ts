import type { TrackStage } from '@/types/database'

/**
 * The standard professional record-production lifecycle, in linear order.
 * Used to drive the stage pipeline, ring fills, and album progress.
 */
export const STAGE_ORDER: TrackStage[] = [
  'idea',
  'demo',
  'pre_production',
  'recording',
  'editing',
  'mix',
  'final_mix',
  'master',
  'release',
]

/** Each stage mapped to an evenly-spaced 0..1 completion value. */
export const STAGE_VALUE = Object.fromEntries(
  STAGE_ORDER.map((s, i) => [s, STAGE_ORDER.length > 1 ? i / (STAGE_ORDER.length - 1) : 0]),
) as Record<TrackStage, number>

export const STAGE_LABEL: Record<TrackStage, string> = {
  idea: 'Idea',
  demo: 'Demo',
  pre_production: 'Pre-Production',
  recording: 'Recording',
  editing: 'Editing',
  mix: 'Mix',
  final_mix: 'Final Mix',
  master: 'Master',
  release: 'Release',
}

/** A short "what to do at this step" hint, for when you feel stuck. */
export const STAGE_HINT: Record<TrackStage, string> = {
  idea: 'Capture the concept — lyrics, melody, chords, references.',
  demo: 'Lay down a rough recording to capture the idea.',
  pre_production: 'Plan the arrangement: structure, tempo, key, instrumentation.',
  recording: 'Track the real instruments and vocals.',
  editing: 'Comp the best takes, tune, fix timing, clean up.',
  mix: 'Balance levels, EQ, panning and effects.',
  final_mix: 'Lock the approved mix — revisions and final touches.',
  master: 'Final polish: loudness, tonal balance and format prep.',
  release: 'Delivered, distributed and published.',
}
