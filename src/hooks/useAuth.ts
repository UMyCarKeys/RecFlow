import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email: string, password: string, username: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        // Send the confirmation link back to wherever the app is actually
        // running (dev port or prod domain) instead of Supabase's default
        // Site URL — which pointed at a port with nothing listening
        // ("localhost refused to connect"). NOTE: this exact origin must also
        // be added to Supabase → Auth → URL Configuration → Redirect URLs, and
        // the prod domain set as the Site URL.
        emailRedirectTo: window.location.origin,
      },
    })

  const signOut = () => supabase.auth.signOut()

  return { session, user, loading, signIn, signUp, signOut }
}
