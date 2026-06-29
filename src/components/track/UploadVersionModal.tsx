import { useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import { getUploadUrl } from '@/lib/r2'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface UploadVersionModalProps {
  open: boolean
  onClose: () => void
  trackId: string
  onUploaded: () => void
}

const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aiff', 'audio/flac']

export function UploadVersionModal({ open, onClose, trackId, onUploaded }: UploadVersionModalProps) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [variant, setVariant] = useState('')
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !user) return
    setLoading(true)
    setError('')

    try {
      const { uploadUrl, audioKey } = await getUploadUrl(trackId, file.name, file.type)

      setProgress(10)
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error('Upload to R2 failed')
      setProgress(80)

      const { error: dbErr } = await supabase.from('versions').insert({
        track_id: trackId,
        audio_key: audioKey,
        file_name: file.name,
        file_size: file.size,
        duration: null,
        description: description.trim() || null,
        tags,
        variant: variant.trim() || null,
        uploaded_by: user.id,
        version_number: 0,
      })
      if (dbErr) throw dbErr
      setProgress(100)

      setTimeout(() => {
        setFile(null)
        setDescription('')
        setTags([])
        setVariant('')
        setProgress(0)
        onUploaded()
        onClose()
      }, 300)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload New Version">
      <form id="upload-version-form" onSubmit={handleSubmit} className="space-y-4">
        <div
          id="upload-dropzone"
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-white/10 hover:border-accent/40 rounded-xl p-6 text-center cursor-pointer transition-colors"
        >
          {file ? (
            <p className="text-sm text-white">{file.name} <span className="text-muted">({(file.size / 1024 / 1024).toFixed(1)} MB)</span></p>
          ) : (
            <>
              <p className="text-sm text-muted">Drop your audio file here, or click to browse</p>
              <p className="text-xs text-muted/60 mt-1">MP3, WAV, AIFF, FLAC</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f && ALLOWED_TYPES.includes(f.type)) setFile(f)
              else setError('Unsupported file type')
            }}
          />
        </div>

        <div id="upload-description">
          <label className="block text-xs text-muted mb-1">What changed? (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="e.g. Reworked the bridge, new vocal take on chorus 2"
            className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <div id="upload-variant">
          <label className="block text-xs text-muted mb-1">Line / variant (optional)</label>
          <input
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            placeholder="e.g. Warm take, Aggressive take — leave blank for the main line"
            className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>

        <div id="upload-tags">
          <label className="block text-xs text-muted mb-1">Tags</label>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="e.g. rough-mix, vocal, bridge"
              className="flex-1 bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
            />
            <Button type="button" variant="ghost" size="sm" onClick={addTag}>Add</Button>
          </div>
          {tags.length > 0 && (
            <div id="upload-tags-list" className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((t) => <Tag key={t} label={t} onRemove={() => setTags((prev) => prev.filter((x) => x !== t))} />)}
            </div>
          )}
        </div>

        {progress > 0 && progress < 100 && (
          <div id="upload-progress" className="h-1 bg-surface-3 rounded-full overflow-hidden">
            <div id="upload-progress-bar" className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {error && <p id="upload-error" className="text-xs text-red-400">{error}</p>}

        <div id="upload-actions" className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!file || loading}>{loading ? 'Uploading…' : 'Upload version'}</Button>
        </div>
      </form>
    </Modal>
  )
}
