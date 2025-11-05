import express from "express";
import { supabase } from "../supabaseClient.js";
import { verifyToken, requireAdmin } from "../authMiddleware.js";

const router = express.Router();

// GET /api/auditoria - Obtener todos los registros de auditoría
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
      id: item.id_auditoria,
      id_auditoria: item.id_auditoria,
      fecha_hora: item.fecha_hora,
      empleado: item.empleados ? `${item.empleados.nombres} ${item.empleados.apellidos}` : 'Sistema',
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

// POST /api/auditoria - Crear un registro de auditoría (para uso interno)
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

// GET /api/auditoria/ingresos-hoy - Obtener ingresos del día actual
router.get("/ingresos-hoy", verifyToken, requireAdmin, async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from("facturas")
      .select("total_neto, fecha_hora")
      .gte("fecha_hora", `${hoy}T00:00:00`)
      .lte("fecha_hora", `${hoy}T23:59:59`)
      .order("fecha_hora", { ascending: false });

    if (error) {
      console.error("Error consultando ingresos del día:", error);
      return res.status(500).json({ message: "Error al obtener ingresos del día" });
    }

    const ingresosHoy = data.reduce((total, factura) => total + (Number(factura.total_neto) || 0), 0);
    const totalVentas = data.length;

    res.json({
      fecha: hoy,
      ingresos_totales: ingresosHoy,
      total_ventas: totalVentas,
      promedio_venta: totalVentas > 0 ? ingresosHoy / totalVentas : 0,
      facturas: data
    });
  } catch (err) {
    console.error("Error en /api/auditoria/ingresos-hoy:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;