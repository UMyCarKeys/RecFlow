import { trackHue } from './trackColor'
import type { Version } from '@/types/database'

export interface VariantLine {
  variant: string | null
  label: string
  versions: Version[]
  latest: Version
}

/** Groups versions (already ordered newest-first) into lines by variant label. */
export function groupVariants(versions: Version[]): VariantLine[] {
  const map = new Map<string, Version[]>()
  for (const v of versions) {
    const key = v.variant ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(v)
  }
  return Array.from(map.entries()).map(([key, vs]) => ({
    variant: key || null,
    label: key || 'Main',
    versions: vs,
    latest: vs[0],
  }))
}

/** A stable color per line (null/main = neutral). */
export function variantHue(variant: string | null): string {
  return variant ? trackHue(variant) : '#9a8fa3'
}

/** Stages where exploring parallel lines is allowed. */
export const COMPARE_STAGES = ['demo', 'pre_production', 'recording', 'editing', 'mix'] as const
export const POST_MIX_STAGES = ['final_mix', 'master', 'release'] as const
