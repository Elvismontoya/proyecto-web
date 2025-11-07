// server/db/supabase.js
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE en variables de entorno.')
  process.exit(1)
}

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false } }
)
