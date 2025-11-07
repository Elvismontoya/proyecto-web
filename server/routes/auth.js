import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../db/supabase.js'

const router = express.Router()

/* ===========================================================
   1. Saber si NECESITAMOS crear el primer admin
   GET /api/auth/check-initial
   =========================================================== */
router.get('/check-initial', async (req, res) => {
  try {
    const { data: empleados, error } = await supabaseAdmin
      .from('empleados')
      .select(`
        id_empleado,
        activo,
        id_rol,
        roles:roles!empleados_id_rol_fkey(nombre_rol)
      `)
      .eq('activo', true)

    if (error) {
      console.error(error)
      return res.status(500).json({ message: 'Error consultando empleados' })
    }

    const hayAdmin = empleados?.some(
      (e) => e.roles?.nombre_rol?.toLowerCase() === 'admin'
    )

    res.json({ needsAdmin: !hayAdmin })
  } catch (err) {
    console.error('Error check-initial:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

/* ===========================================================
   2. Registrar PRIMER administrador
   POST /api/auth/register-admin
   Body: { nombres, apellidos, usuario, password }
   Solo funciona si aún NO existe admin
   =========================================================== */
router.post('/register-admin', async (req, res) => {
  const { nombres, apellidos, usuario, password } = req.body

  if (!nombres || !apellidos || !usuario || !password) {
    return res.status(400).json({ message: 'Campos incompletos' })
  }

  try {
    // ¿Ya hay admin activo?
    const { data: empleados, error: errCheck } = await supabaseAdmin
      .from('empleados')
      .select(`
        id_empleado,
        activo,
        id_rol,
        roles:roles!empleados_id_rol_fkey(nombre_rol)
      `)
      .eq('activo', true)

    if (errCheck) {
      console.error(errCheck)
      return res.status(500).json({ message: 'Error validando admin' })
    }

    const hayAdmin = empleados?.some(
      (e) => e.roles?.nombre_rol?.toLowerCase() === 'admin'
    )

    if (hayAdmin) {
      return res.status(403).json({ message: 'Ya existe un administrador registrado.' })
    }

    // Buscar id_rol del admin
    const { data: rolAdmin, error: rolErr } = await supabaseAdmin
      .from('roles')
      .select('id_rol')
      .eq('nombre_rol', 'admin')
      .single()

    if (rolErr || !rolAdmin) {
      console.error(rolErr)
      return res.status(500).json({ message: 'No se encontró el rol admin' })
    }

    // Hashear contraseña
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10)
    const hashed = await bcrypt.hash(password, rounds)

    // Insertar empleado admin
    const { data: nuevoEmp, error: insErr } = await supabaseAdmin
      .from('empleados')
      .insert([{
        nombres,
        apellidos,
        usuario_login: usuario,
        password_hash: hashed,
        id_rol: rolAdmin.id_rol,
        activo: true
      }])
      .select('id_empleado, usuario_login')
      .single()

    if (insErr || !nuevoEmp) {
      console.error(insErr)
      return res.status(500).json({ message: 'No se pudo crear el administrador' })
    }

    // Crear token JWT inmediato
    const token = jwt.sign(
      {
        id_empleado: nuevoEmp.id_empleado,
        usuario_login: nuevoEmp.usuario_login,
        rol: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      message: 'Administrador creado correctamente',
      token,
      rol: 'admin'
    })
  } catch (err) {
    console.error('Error register-admin:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

/* ===========================================================
   3. Login normal
   POST /api/auth/login
   Body: { usuario, password }
   =========================================================== */
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body

  if (!usuario || !password) {
    return res.status(400).json({ message: 'Faltan credenciales' })
  }

  try {
    // Buscar empleado por usuario_login
    const { data: emp, error: errEmp } = await supabaseAdmin
      .from('empleados')
      .select('id_empleado, usuario_login, password_hash, id_rol, activo')
      .eq('usuario_login', usuario)
      .single()

    if (errEmp || !emp) {
      return res.status(401).json({ message: 'Usuario o contraseña inválidos' })
    }

    if (!emp.activo) {
      return res.status(403).json({ message: 'Usuario inactivo' })
    }

    // Comparar contraseña
    const ok = await bcrypt.compare(password, emp.password_hash)
    if (!ok) {
      return res.status(401).json({ message: 'Usuario o contraseña inválidos' })
    }

    // Traer rol
    const { data: rolData } = await supabaseAdmin
      .from('roles')
      .select('nombre_rol')
      .eq('id_rol', emp.id_rol)
      .single()

    const rol = rolData?.nombre_rol || 'cajero'

    // Generar token
    const token = jwt.sign(
      {
        id_empleado: emp.id_empleado,
        usuario_login: emp.usuario_login,
        rol
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({ message: 'Login exitoso', token, rol })
  } catch (err) {
    console.error('Error login:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

export default router
