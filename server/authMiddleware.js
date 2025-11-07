import jwt from 'jsonwebtoken'

// Extrae de forma segura el token "Bearer ..."
function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization
  if (!header || typeof header !== 'string') return null

  const parts = header.trim().split(/\s+/) // separa por espacios múltiples
  if (parts.length !== 2) return null
  const [scheme, token] = parts
  if (!/^Bearer$/i.test(scheme)) return null
  return token || null
}

// Verifica que el request tenga un token válido
export function verifyToken(req, res, next) {
  const token = getBearerToken(req)
  if (!token) {
    return res.status(401).json({ message: 'Token requerido' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],     // explícito para evitar alg none
      clockTolerance: 5          // segundos de tolerancia por desfase de reloj
    })
    // payload esperado: { id_empleado, usuario_login, rol, iat, exp }
    // Normaliza el rol para comparaciones
    if (payload?.rol) payload.rol = String(payload.rol).toLowerCase()
    req.user = payload
    next()
  } catch (err) {
    return res.status(403).json({ message: 'Token expirado o inválido' })
  }
}

// Requiere rol "admin"
export function requireAdmin(req, res, next) {
  if (!req.user?.rol || req.user.rol !== 'admin') {
    return res.status(403).json({ message: 'Solo administrador puede hacer esto' })
  }
  next()
}

// Requiere uno de varios roles (p.ej. requireRoles('admin','cajero'))
export function requireRoles(...roles) {
  const set = new Set(roles.map(r => String(r).toLowerCase()))
  return (req, res, next) => {
    const userRole = req.user?.rol
    if (!userRole || !set.has(userRole)) {
      return res.status(403).json({ message: 'Permisos insuficientes' })
    }
    next()
  }
}
