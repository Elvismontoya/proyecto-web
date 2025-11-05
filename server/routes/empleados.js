import express from "express";
import { supabase } from "../supabaseClient.js";
import { verifyToken, requireAdmin } from "../authMiddleware.js";

const router = express.Router();

// GET /api/empleados
// Obtiene todos los empleados activos
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
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
        roles:roles(nombre_rol)
      `)
      .eq("activo", true)
      .order("nombres");

    if (error) {
      console.error("Error consultando empleados:", error);
      return res.status(500).json({ message: "Error al obtener empleados" });
    }

    // Formatear respuesta
    const empleadosFormateados = data.map(emp => ({
      id_empleado: emp.id_empleado,
      nombres: emp.nombres,
      apellidos: emp.apellidos,
      documento: emp.documento,
      telefono: emp.telefono,
      usuario_login: emp.usuario_login,
      rol: emp.roles?.nombre_rol,
      activo: emp.activo,
      fecha_creacion: emp.fecha_creacion
    }));

    res.json(empleadosFormateados);
  } catch (err) {
    console.error("Error en /api/empleados:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;