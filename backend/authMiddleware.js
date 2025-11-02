import jwt from 'jsonwebtoken';

// Verifica que el request tenga un token válido
export function verifyToken(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({ message: 'Token requerido' });
  }

  const token = header.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token inválido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { id_empleado, usuario_login, rol }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token expirado o inválido' });
  }
}

// Solo admin puede hacer ciertas acciones
export function requireAdmin(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res
      .status(403)
      .json({ message: 'Solo administrador puede hacer esto' });
  }
  next();
}
