import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Comment, Task } from '@/types/database'

export interface AddOpts {
  parentId?: string
  timestampS?: number
  task?: { label: string; assigneeId: string | null }
}

const COMMENT_SELECT = '*, profiles(*)'
const TASK_SELECT = '*, assignee:profiles!tasks_assignee_id_fkey(*)'

/**
 * Unified comment + task thread for a version. Comments are the stream; a
 * comment can optionally carry a task (assignee + done state). Tasks live in
 * their own table but are anchored to a comment via comment_id and inherit the
 * comment's timestamp.
 */
export function useThread(versionId: string, projectId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!versionId) return
    let cancelled = false
    Promise.all([
      supabase.from('comments').select(COMMENT_SELECT).eq('version_id', versionId).order('created_at'),
      supabase.from('tasks').select(TASK_SELECT).eq('version_id', versionId),
    ]).then(([{ data: cData }, { data: tData }]) => {
      if (cancelled) return
      const taskByComment = new Map<string, Task>()
      for (const t of (tData as Task[]) ?? []) if (t.comment_id) taskByComment.set(t.comment_id, t)

      const nodes: Comment[] = ((cData as Comment[]) ?? []).map((c) => ({
        ...c,
        task: taskByComment.get(c.id) ?? null,
        replies: [],
      }))
      const byId = new Map(nodes.map((c) => [c.id, c]))
      const roots: Comment[] = []
      for (const c of nodes) {
        if (c.parent_id && byId.has(c.parent_id)) byId.get(c.parent_id)!.replies!.push(c)
        else roots.push(c)
      }
      setComments(roots)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [versionId])

  const addComment = async (body: string, authorId: string, opts: AddOpts = {}) => {
    const { data: cData, error } = await supabase
      .from('comments')
      .insert({
        version_id: versionId,
        body,
        author_id: authorId,
        parent_id: opts.parentId ?? null,
        timestamp_s: opts.timestampS ?? null,
      })
      .select(COMMENT_SELECT)
      .single()
    if (error || !cData) return { error }
    const comment = cData as Comment

    let task: Task | null = null
    if (opts.task) {
      const { data: tData } = await supabase
        .from('tasks')
        .insert({
          version_id: versionId,
          project_id: projectId,
          comment_id: comment.id,
          title: opts.task.label.trim() || body.slice(0, 80),
          body: null,
          assignee_id: opts.task.assigneeId,
          created_by: authorId,
        })
        .select(TASK_SELECT)
        .single()
      task = (tData as Task) ?? null
    }

    const node: Comment = { ...comment, task, replies: [] }
    setComments((prev) =>
      opts.parentId
        ? prev.map((c) => (c.id === opts.parentId ? { ...c, replies: [...(c.replies ?? []), node] } : c))
        : [...prev, node],
    )
    return { error: null }
  }

  const setTaskDone = async (taskId: string, done: boolean) => {
    const status = done ? 'done' : 'open'
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    setComments((prev) => mapComments(prev, (c) => (c.task?.id === taskId ? { ...c, task: { ...c.task, status } } : c)))
  }

  const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    setComments((prev) => mapComments(prev, (c) => (c.task?.id === taskId ? { ...c, task: null } : c)))
  }

  const deleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments((prev) => removeComment(prev, commentId))
  }

  return { comments, loading, addComment, setTaskDone, deleteTask, deleteComment }
}

function mapComments(list: Comment[], fn: (c: Comment) => Comment): Comment[] {
  return list.map((c) => {
    const mapped = fn(c)
    return mapped.replies?.length ? { ...mapped, replies: mapComments(mapped.replies, fn) } : mapped
  })
}

function removeComment(list: Comment[], id: string): Comment[] {
  return list
    .filter((c) => c.id !== id)
    .map((c) => (c.replies?.length ? { ...c, replies: removeComment(c.replies, id) } : c))
}
