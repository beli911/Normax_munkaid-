import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/** True, ha a .env.local-ban megvannak a Supabase változók (URL + anon key). */
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Ha nincs konfig, placeholderrel inicializálunk, hogy ne dobjon a createClient (az első API hívás majd hibázik)
const url = supabaseUrl || 'https://placeholder.supabase.co'
const key = supabaseAnonKey || 'placeholder-key'

export const supabase = createClient(url, key)


