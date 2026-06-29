import { supabase } from '@/lib/supabase'

export type LoadPhase = 'request' | 'download' | 'decode'
export type ProgressFn = (phase: LoadPhase, progress: number) => void

export async function fetchAudioBlob(versionId: string, onProgress?: ProgressFn): Promise<string> {
  const session = (await supabase.auth.getSession()).data.session
  if (!session) throw new Error('Not authenticated')

  // 1. Request the signed URL from the edge function
  onProgress?.('request', 0)
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

  // 2. Stream the audio down, reporting byte progress
  onProgress?.('download', 0)
  const audioRes = await fetch(url)
  if (!audioRes.ok) throw new Error('Failed to fetch audio')

  const total = Number(audioRes.headers.get('Content-Length')) || 0
  const reader = audioRes.body?.getReader()
  let blob: Blob

  if (reader) {
    const chunks: Uint8Array[] = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      if (total) onProgress?.('download', received / total)
    }
    blob = new Blob(chunks as BlobPart[], { type: audioRes.headers.get('Content-Type') ?? 'audio/mpeg' })
  } else {
    blob = await audioRes.blob()
  }

  // 3. Hand off to the decoder
  onProgress?.('decode', 1)
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
