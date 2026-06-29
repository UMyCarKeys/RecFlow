/**
 * Resolves the name to show for a profile: their chosen display name (full_name)
 * if set, otherwise their username. Because profiles are joined fresh on every
 * fetch, changing the display name updates everywhere it's shown.
 */
export function displayName(
  profile?: { full_name?: string | null; username?: string | null } | null,
  fallback = 'Someone',
): string {
  return profile?.full_name?.trim() || profile?.username || fallback
}
