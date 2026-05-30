'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  expertise: string[]
  email: string | null
}

let cache: Profile | null = null

async function fetchProfile(): Promise<Profile | null> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return {
    id:           user.id,
    display_name: data?.display_name || user.user_metadata?.name || null,
    avatar_url:   data?.avatar_url   ? `${data.avatar_url}?t=${Date.now()}` : user.user_metadata?.avatar_url || null,
    bio:          data?.bio          || null,
    location:     data?.location     || null,
    expertise:    data?.expertise    || [],
    email:        user.email         || null,
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(cache)
  const [loading, setLoading] = useState(!cache)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const result = await fetchProfile()
    if (!mountedRef.current) return
    cache = result
    setProfile(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (cache) { setProfile(cache); setLoading(false); return }
    load()
  }, [load])

  const refresh = useCallback(() => {
    cache = null
    load()
  }, [load])

  return { profile, loading, refresh }
}
