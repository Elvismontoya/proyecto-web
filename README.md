##############################################
# 🔐 CONFIGURACIÓN DE SUPABASE (BACKEND)
##############################################

# URL del proyecto Supabase
SUPABASE_URL=

# Llave SERVICE_ROLE de Supabase (NO la anon)
SUPABASE_SERVICE_ROLE=

##############################################
# 🔑 AUTENTICACIÓN JWT
##############################################

# Clave secreta para firmar JWT
JWT_SECRET=una_clave_segura_larga_y_unica

##############################################
# 🧂 CONFIGURACIÓN OPCIONAL
##############################################

# Cantidad de rondas para bcrypt (default recomendado 10-12)
BCRYPT_SALT_ROUNDS=10

##############################################
# 🌐 CORS PRODUCCIÓN
##############################################

# Dominio del frontend en producción (ej: https://tu-app.vercel.app)
# Si no se usa, CORS permitirá todo en desarrollo
FRONTEND_ORIGIN=

##############################################
# ⚠️ OPCIONAL (SOLO si usas un ORM o conexión directa)
##############################################
