import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kxfdrixsoujxnsysslzq.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ WARNING: Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in environment configuration.')
}

/**
 * Custom fetch that intercepts Supabase auth requests.
 * We use the backend API as the primary auth source, so Supabase errors
 * (400/401 from non-existent demo users) are silently handled.
 */
const supabaseFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
  const isSupabaseAuth = url.includes('supabase.co/auth/v1/')

  if (isSupabaseAuth) {
    try {
      const response = await globalThis.fetch(input, init)
      if (!response.ok) {
        // Return a clean error object so Supabase handles it gracefully
        // without printing to console
        return new Response(
          JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Auth handled by backend API'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return response
    } catch (_err) {
      return new Response(
        JSON.stringify({
          error: 'network_error',
          error_description: 'Supabase unavailable — using backend API'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
  return globalThis.fetch(input, init)
}

/**
 * Global singleton reference to prevent duplicate GoTrueClient / SupabaseClient
 * instantiations during Vite HMR or multiple module evaluation passes.
 */
const globalForSupabase = globalThis as unknown as {
  __campusresolve_supabase_instance__?: SupabaseClient
}

const getSupabaseClient = (): SupabaseClient => {
  if (!globalForSupabase.__campusresolve_supabase_instance__) {
    globalForSupabase.__campusresolve_supabase_instance__ = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'sdcfrs-supabase-auth'
      },
      global: {
        fetch: supabaseFetch
      }
    })
  }
  return globalForSupabase.__campusresolve_supabase_instance__
}

export const supabase = getSupabaseClient()
