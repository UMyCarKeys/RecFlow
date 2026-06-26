import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUiStore } from '@/store/uiStore'
import type { Version } from '@/types/database'

export function useRealtimeVersions(trackId: string, onNewVersion: (v: Version) => void) {
  const showToast = useUiStore((s) => s.showToast)

  useEffect(() => {
    if (!trackId) return

    const channel = supabase
      .channel(`versions:track:${trackId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'versions', filter: `track_id=eq.${trackId}` },
        (payload) => {
          const version = payload.new as Version
          onNewVersion(version)
          showToast(`New version v${version.version_number} uploaded`)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [trackId, onNewVersion, showToast])
}
