import type { TrackStage } from '@/types/database'

/** Maps each production stage to a 0..1 completion value. */
export const STAGE_VALUE: Record<TrackStage, number> = {
  idea: 0,
  demo: 0.25,
  mix: 0.5,
  final_mix: 0.75,
  master: 1,
}

export const STAGE_ORDER: TrackStage[] = ['idea', 'demo', 'mix', 'final_mix', 'master']

export const STAGE_LABEL: Record<TrackStage, string> = {
  idea: 'Idea',
  demo: 'Demo',
  mix: 'Mix',
  final_mix: 'Final Mix',
  master: 'Master',
}
