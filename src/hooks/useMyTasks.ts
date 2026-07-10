import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TaskStatus } from '@/types/database'

export interface MyTask {
  id: string
  title: string
  body: string | null
  status: TaskStatus
  due_date: string | null
  created_at: string
  project_id: string
  project_name: string
  track_id: string
}

export interface MyMembership {
  id: string
  project_id: string
  project_name: string
  joined_at: string
}

// Rows come back with joined relations that PostgREST types loosely; narrow here.
type TaskRow = {
  id: string
  title: string
  body: string | null
  status: TaskStatus
  due_date: string | null
  created_at: string
  project_id: string
  versions?: { track_id?: string } | { track_id?: string }[]
  projects?: { name?: string } | { name?: string }[]
}

function one<T>(v: T | T[] | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v
}

/**
 * Everything assigned to the current user, LIVE: tasks (all statuses — the
 * Tasks page shows completed ones as history, the bell shows only unfinished)
 * plus recent project-membership additions ("you were added to X").
 * Subscribes to realtime changes on both tables and refetches on any event,
 * so the bell badge ticks without navigation.
 */
export function useMyTasks(userId?: string) {
  const [tasks, setTasks] = useState<MyTask[]>([])
  const [memberships, setMemberships] = useState<MyMembership[]>([])

  const refetch = useCallback(() => {
    if (!userId) return
    supabase
      .from('tasks')
      .select('id, title, body, status, due_date, created_at, project_id, versions!inner(track_id), projects(name)')
      .eq('assignee_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTasks(
          ((data ?? []) as TaskRow[]).map((r) => ({
            id: r.id,
            title: r.title,
            body: r.body,
            status: r.status,
            due_date: r.due_date,
            created_at: r.created_at,
            project_id: r.project_id,
            project_name: one(r.projects)?.name ?? '',
            track_id: one(r.versions)?.track_id ?? '',
          })),
        )
      })
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    supabase
      .from('project_members')
      .select('id, project_id, joined_at, projects(name)')
      .eq('user_id', userId)
      .gt('joined_at', since)
      .order('joined_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setMemberships(
          ((data ?? []) as Array<{ id: string; project_id: string; joined_at: string; projects?: { name?: string } | { name?: string }[] }>).map((r) => ({
            id: r.id,
            project_id: r.project_id,
            project_name: one(r.projects)?.name ?? 'a project',
            joined_at: r.joined_at,
          })),
        )
      })
  }, [userId])

  useEffect(() => {
    if (!userId) return
    refetch()
    // Any change to my tasks or my memberships → refetch (simpler and more
    // robust than patching local state per event type).
    // Topic must be unique PER HOOK INSTANCE: supabase.channel() returns the
    // existing channel for an already-used topic, so a second component using
    // this hook (bell + tasks panel) would call .on() on a channel that's
    // already subscribed — which throws ("cannot add postgres_changes
    // callbacks after subscribe()") and crashed the tasks page.
    const channel = supabase
      .channel(`me:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `assignee_id=eq.${userId}` },
        refetch,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_members', filter: `user_id=eq.${userId}` },
        refetch,
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, refetch])

  const setTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      // Optimistic: flip locally, reconcile via the realtime refetch.
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)))
      await supabase.from('tasks').update({ status }).eq('id', taskId)
    },
    [],
  )

  const openTasks = tasks.filter((t) => t.status !== 'done')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  return { tasks, openTasks, doneTasks, memberships, setTaskStatus, count: openTasks.length }
}
