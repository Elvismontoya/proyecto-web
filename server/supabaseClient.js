// server/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Directorio real de este archivo (no depende de desde dónde corras node/nodemon)
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Ruta esperada del .env junto a este archivo
const ENV_PATH = path.join(__dirname, '.env');

// 1) Verificamos que el archivo .env exista
const exists = fs.existsSync(ENV_PATH);
console.log('🔎 supabaseClient.js');
console.log('   process.cwd():', process.cwd());
console.log('   __dirname:    ', __dirname);
console.log('   .env path:    ', ENV_PATH);
console.log('   .env exists:  ', exists);

// 2) Cargamos dotenv desde esa ruta exacta
dotenv.config({ path: ENV_PATH });

// 3) Leemos variables
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
console.log('   ENV flags -> URL:', !!SUPABASE_URL, ' SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);

// 4) Validación estricta
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

// 5) Cliente supabase (service_role SOLO en backend)
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
