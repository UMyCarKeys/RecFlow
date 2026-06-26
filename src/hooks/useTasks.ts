import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, TaskStatus } from '@/types/database'

export function useTasks(versionId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!versionId) return
    supabase
      .from('tasks')
      .select('*, assignee:profiles!tasks_assignee_id_fkey(*), creator:profiles!tasks_created_by_fkey(*)')
      .eq('version_id', versionId)
      .order('created_at')
      .then(({ data }) => {
        setTasks((data as Task[]) ?? [])
        setLoading(false)
      })
  }, [versionId])

  const addTask = async (title: string, body: string, assigneeId: string | null, projectId: string, createdBy: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ version_id: versionId, project_id: projectId, title, body, assignee_id: assigneeId, created_by: createdBy })
      .select('*, assignee:profiles!tasks_assignee_id_fkey(*), creator:profiles!tasks_created_by_fkey(*)')
      .single()
    if (!error && data) setTasks((prev) => [...prev, data as Task])
    return { data, error }
  }

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)
    if (!error) setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)))
    return { error }
  }

  return { tasks, loading, addTask, updateStatus }
}
