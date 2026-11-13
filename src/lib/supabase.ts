import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createDemoClient } from './demo-backend'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** Aperçu hors ligne (fichier unique) : base de démonstration locale, sans Internet */
export const DEMO = import.meta.env.VITE_SINGLE === '1'

export const supabaseReady = DEMO || Boolean(url && key)
export const supabase: SupabaseClient = DEMO
  ? (createDemoClient() as unknown as SupabaseClient)
  : createClient(url ?? 'http://localhost', key ?? 'missing', {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'yves-auth' },
    })
