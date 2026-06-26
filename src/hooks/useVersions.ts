import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Version } from '@/types/database'

export function useVersions(trackId: string) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!trackId) return
    supabase
      .from('versions')
      .select('*, profiles(*)')
      .eq('track_id', trackId)
      .order('version_number', { ascending: false })
      .then(({ data }) => {
        setVersions((data as Version[]) ?? [])
        setLoading(false)
      })
  }, [trackId])

  const addVersion = (version: Version) =>
    setVersions((prev) => [version, ...prev])

  return { versions, loading, addVersion }
}
