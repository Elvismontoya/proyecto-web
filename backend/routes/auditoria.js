import express from "express";
import { supabase } from "../supabaseClient.js";
import { verifyToken, requireAdmin } from "../authMiddleware.js";

const router = express.Router();

// GET /api/auditoria
// Obtiene todos los registros de auditoría
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("auditoria")
      .select(`
        *,
        empleados:empleados(id_empleado, nombres, apellidos)
      `)
      .order("fecha_hora", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error consultando auditoría:", error);
      return res.status(500).json({ message: "Error al obtener auditoría" });
    }

    // Formatear los datos
    const auditoriaFormateada = data.map(item => ({
      id_auditoria: item.id_auditoria,
      fecha_hora: item.fecha_hora,
      empleado: item.empleados ? `${item.empleados.nombres} ${item.empleados.apellidos}` : null,
      accion: item.accion,
      tabla_afectada: item.tabla_afectada,
      id_registro_afectado: item.id_registro_afectado,
      descripcion: item.descripcion
    }));

    res.json(auditoriaFormateada);
  } catch (err) {
    console.error("Error en /api/auditoria:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// POST /api/auditoria
// Crear un registro de auditoría (para uso interno)
router.post("/", async (req, res) => {
  const { id_empleado, accion, tabla_afectada, id_registro_afectado, descripcion } = req.body;

  try {
    const { data, error } = await supabase
      .from("auditoria")
      .insert([
        {
          id_empleado: id_empleado || null,
          accion,
          tabla_afectada,
          id_registro_afectado,
          descripcion
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creando auditoría:", error);
      return res.status(500).json({ message: "Error al crear registro de auditoría" });
    }

    res.status(201).json({ message: "Registro de auditoría creado", data });
  } catch (err) {
    console.error("Error en POST /api/auditoria:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;