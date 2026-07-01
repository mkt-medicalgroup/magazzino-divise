import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Manca la configurazione di Supabase. Crea un file .env (vedi .env.example) con VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
