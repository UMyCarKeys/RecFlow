import { createClient } from '@supabase/supabase-js'

// Types are applied via explicit casts in hooks/components.
// Run `supabase gen types typescript` once connected to apply full type safety.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
