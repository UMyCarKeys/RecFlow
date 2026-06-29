import { supabase } from './supabase'

/**
 * Uploads a custom cover image to the public 'covers' storage bucket and returns
 * its public URL. Keyed under the project id so a project's covers group together.
 */
export async function uploadCover(projectId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${projectId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('covers').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error
  return supabase.storage.from('covers').getPublicUrl(path).data.publicUrl
}
