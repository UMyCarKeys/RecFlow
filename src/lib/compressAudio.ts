import { Mp3Encoder } from '@breezystack/lamejs'

/**
 * Cross-browser audio compression: decodes a file via the Web Audio API and
 * re-encodes it to MP3 with a pure-JS encoder (no ffmpeg.wasm). Used to shrink
 * large lossless uploads (WAV/AIFF/FLAC) so they cost less to store and stream.
 */

const LOSSLESS = /wav|aif|aiff|flac/i

/** Only worth compressing lossless/large formats; leave existing MP3s alone. */
export function shouldCompress(file: File): boolean {
  return LOSSLESS.test(file.type) || LOSSLESS.test(file.name)
}

function floatToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

async function encodeMp3(buffer: AudioBuffer, bitrate: number, onProgress?: (p: number) => void): Promise<Blob> {
  const channels = Math.min(buffer.numberOfChannels, 2)
  const encoder = new Mp3Encoder(channels, buffer.sampleRate, bitrate)
  const left = floatToInt16(buffer.getChannelData(0))
  const right = channels > 1 ? floatToInt16(buffer.getChannelData(1)) : null
  const block = 1152
  const chunks: Uint8Array[] = []
  const len = left.length

  for (let i = 0; i < len; i += block) {
    const l = left.subarray(i, i + block)
    const mp3 = right ? encoder.encodeBuffer(l, right.subarray(i, i + block)) : encoder.encodeBuffer(l)
    if (mp3.length > 0) chunks.push(mp3)
    if ((i / block) % 200 === 0) {
      onProgress?.(i / len)
      await new Promise((r) => setTimeout(r, 0)) // yield so the UI stays responsive
    }
  }
  const end = encoder.flush()
  if (end.length > 0) chunks.push(end)
  onProgress?.(1)
  return new Blob(chunks as BlobPart[], { type: 'audio/mpeg' })
}

export async function compressToMp3(file: File, onProgress?: (p: number) => void, bitrate = 192): Promise<File> {
  const arrayBuf = await file.arrayBuffer()
  const AC: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AC()
  const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
    // Callback form for the widest browser support (incl. older Safari)
    ctx.decodeAudioData(arrayBuf.slice(0), resolve, reject)
  })
  try {
    await ctx.close()
  } catch {
    /* ignore */
  }
  const blob = await encodeMp3(buffer, bitrate, onProgress)
  const name = file.name.replace(/\.[^.]+$/, '') + '.mp3'
  return new File([blob], name, { type: 'audio/mpeg' })
}
