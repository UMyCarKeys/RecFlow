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
      .eq('set_aside', false)
      .order('version_number', { ascending: false })
      .then(({ data }) => {
        setVersions((data as Version[]) ?? [])
        setLoading(false)
      })
  }, [trackId])

  const addVersion = (version: Version) => setVersions((prev) => [version, ...prev])

  const setVariant = async (versionId: string, variant: string | null) => {
    const v = variant?.trim() || null
    await supabase.from('versions').update({ variant: v }).eq('id', versionId)
    setVersions((prev) => prev.map((x) => (x.id === versionId ? { ...x, variant: v } : x)))
  }

  // Commit to one line: set every other line aside (hidden from the track)
  const commitToVariant = async (keepVariant: string | null) => {
    const ids = versions.filter((v) => (v.variant ?? null) !== (keepVariant ?? null)).map((v) => v.id)
    if (ids.length === 0) return
    await supabase.from('versions').update({ set_aside: true }).in('id', ids)
    setVersions((prev) => prev.filter((v) => (v.variant ?? null) === (keepVariant ?? null)))
  }

  return { versions, loading, addVersion, setVariant, commitToVariant }
}
