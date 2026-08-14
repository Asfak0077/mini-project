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
 * Global singleton reference to prevent duplicate GoTrueClient / SupabaseClient
 * instantiations during Vite HMR or multiple module evaluation passes.
 */
const globalForSupabase = globalThis as unknown as {
  __campusresolve_supabase_instance__?: SupabaseClient
}

const getSupabaseClient = (): SupabaseClient => {
  if (!globalForSupabase.__campusresolve_supabase_instance__) {
    globalForSupabase.__campusresolve_supabase_instance__ = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'sdcfrs-supabase-auth'
        }
      }
    )
  }
  return globalForSupabase.__campusresolve_supabase_instance__
}

export const supabase = getSupabaseClient()
