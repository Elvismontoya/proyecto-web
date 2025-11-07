// server/routes/empleados.js
import express from "express"
import { supabaseAdmin } from "../db/supabase.js"
import { verifyToken, requireAdmin } from "../authMiddleware.js"

const router = express.Router()

// GET /api/empleados?search=&page=1&limit=50
// Lista empleados activos (admin), con join a roles
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    // Paginar (opcional)
    const page  = Math.max(parseInt(req.query.page ?? "1", 10), 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "50", 10), 1), 100)
    const from = (page - 1) * limit
    const to   = from + limit - 1

    const search = (req.query.search ?? "").trim()

    // Base query
    let query = supabaseAdmin
      .from("empleados")
      .select(`
        id_empleado,
        nombres,
        apellidos,
        documento,
        telefono,
        usuario_login,
        activo,
        fecha_creacion,
        roles:roles!empleados_id_rol_fkey(nombre_rol)
      `, { count: "exact" }) // devuelve count total
      .eq("activo", true)
      .order("nombres", { ascending: true })
      .range(from, to)

    // Filtro de búsqueda (opcional)
    if (search) {
      query = query.or(
        `nombres.ilike.%${search}%,apellidos.ilike.%${search}%,usuario_login.ilike.%${search}%`
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Error consultando empleados:", error)
      return res.status(500).json({ message: "Error al obtener empleados" })
    }

    const empleadosFormateados = (data ?? []).map(emp => ({
      id_empleado: emp.id_empleado,
      nombres: emp.nombres,
      apellidos: emp.apellidos,
      documento: emp.documento,
      telefono: emp.telefono,
      usuario_login: emp.usuario_login,
      rol: emp.roles?.nombre_rol ?? null,
      activo: emp.activo,
      fecha_creacion: emp.fecha_creacion
    }))

    res.json({
      page,
      limit,
      total: count ?? empleadosFormateados.length,
      data: empleadosFormateados
    })
  } catch (err) {
    console.error("Error en /api/empleados:", err)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

export default router
