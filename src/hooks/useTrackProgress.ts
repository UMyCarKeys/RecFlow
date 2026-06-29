import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { STAGE_VALUE } from '@/lib/progress'
import type { TrackStage } from '@/types/database'

/**
 * Computes album progress from track stages.
 *  - perProject: average stage-value (0..1) of each project's tracks
 *  - overall: average stage-value across every track the user can see
 *
 * One query (RLS scopes it to the user's projects). Refetches when `key` changes.
 */
export function useTrackProgress(key: number = 0) {
  const [perProject, setPerProject] = useState<Record<string, number>>({})
  const [overall, setOverall] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('tracks')
      .select('project_id, stage')
      .eq('archived', false)
      .then(({ data }) => {
        if (cancelled) return
        const groups: Record<string, number[]> = {}
        const all: number[] = []
        for (const row of (data ?? []) as { project_id: string; stage: TrackStage }[]) {
          const v = STAGE_VALUE[row.stage] ?? 0
          ;(groups[row.project_id] ??= []).push(v)
          all.push(v)
        }
        const per: Record<string, number> = {}
        for (const pid in groups) {
          const arr = groups[pid]
          per[pid] = arr.reduce((a, b) => a + b, 0) / arr.length
        }
        setPerProject(per)
        setOverall(all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [key])

  return { perProject, overall, loading }
}
