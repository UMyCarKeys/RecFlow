import { supabase } from '@/lib/supabase'

export async function fetchAudioBlob(versionId: string): Promise<string> {
  const session = (await supabase.auth.getSession()).data.session
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-audio-url`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ versionId }),
    }
  )

  if (!res.ok) throw new Error('Failed to get signed URL')
  const { url } = await res.json()

  const audioRes = await fetch(url)
  if (!audioRes.ok) throw new Error('Failed to fetch audio')

  const blob = await audioRes.blob()
  return URL.createObjectURL(blob)
}

export async function getUploadUrl(
  trackId: string,
  fileName: string,
  mimeType: string
): Promise<{ uploadUrl: string; audioKey: string }> {
  const session = (await supabase.auth.getSession()).data.session
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-upload-url`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ trackId, fileName, mimeType }),
    }
  )

  if (!res.ok) throw new Error('Failed to get upload URL')
  return res.json()
}
