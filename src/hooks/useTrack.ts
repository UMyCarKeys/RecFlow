import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Track } from '@/types/database'

export function useTracks(projectId: string) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    supabase
      .from('tracks')
      .select('*')
      .eq('project_id', projectId)
      .order('position')
      .then(({ data }) => {
        setTracks(data ?? [])
        setLoading(false)
      })
  }, [projectId])

  const addTrack = async (title: string, createdBy: string) => {
    const { data, error } = await supabase
      .from('tracks')
      .insert({ project_id: projectId, title, position: tracks.length, created_by: createdBy })
      .select()
      .single()
    if (!error && data) setTracks((prev) => [...prev, data])
    return { data, error }
  }

  return { tracks, loading, addTrack }
}

export function useTrack(trackId: string) {
  const [track, setTrack] = useState<Track | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!trackId) return
    supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single()
      .then(({ data }) => {
        setTrack(data)
        setLoading(false)
      })
  }, [trackId])

  return { track, loading }
}
