import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Comment } from '@/types/database'

export function useComments(versionId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!versionId) return
    supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('version_id', versionId)
      .is('parent_id', null)
      .order('created_at')
      .then(({ data }) => {
        setComments((data as Comment[]) ?? [])
        setLoading(false)
      })
  }, [versionId])

  const addComment = async (body: string, authorId: string, parentId?: string, timestampS?: number) => {
    const { data, error } = await supabase
      .from('comments')
      .insert({ version_id: versionId, body, author_id: authorId, parent_id: parentId ?? null, timestamp_s: timestampS ?? null })
      .select('*, profiles(*)')
      .single()

    if (!error && data) {
      if (parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies ?? []), data as Comment] }
              : c
          )
        )
      } else {
        setComments((prev) => [...prev, data as Comment])
      }
    }
    return { data, error }
  }

  return { comments, loading, addComment }
}
