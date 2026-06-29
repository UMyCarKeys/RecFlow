import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export interface MyTask {
  id: string
  title: string
  project_id: string
  track_id: string
}

/**
 * Unfinished tasks assigned to the current user, used by the notification bell.
 * Refetches on navigation so the count stays roughly current.
 */
export function useMyTasks(userId?: string) {
  const [tasks, setTasks] = useState<MyTask[]>([])
  const location = useLocation()

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('tasks')
      .select('id, title, project_id, versions!inner(track_id)')
      .eq('assignee_id', userId)
      .neq('status', 'done')
      .then(({ data }) => {
        if (cancelled) return
        const rows = (data ?? []).map((r) => {
          const v = (r as { versions?: { track_id?: string } | { track_id?: string }[] }).versions
          const track_id = Array.isArray(v) ? v[0]?.track_id : v?.track_id
          return {
            id: (r as { id: string }).id,
            title: (r as { title: string }).title,
            project_id: (r as { project_id: string }).project_id,
            track_id: track_id ?? '',
          }
        })
        setTasks(rows)
      })
    return () => {
      cancelled = true
    }
  }, [userId, location.pathname])

  return { tasks, count: tasks.length }
}
