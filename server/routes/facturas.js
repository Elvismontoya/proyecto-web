// server/routes/facturas.js
import express from "express"
import { supabaseAdmin } from "../db/supabase.js"
import { verifyToken } from "../authMiddleware.js"

const router = express.Router()

// ===========================================================
// POST /api/facturas
// Registra factura + detalle + pago + actualiza inventario
// ===========================================================
router.post("/", verifyToken, async (req, res) => {
  const { cliente, subtotal, descuento, total, metodo_pago, productos } = req.body
  const id_empleado = req.user.id_empleado

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ message: "No hay productos en la venta." })
  }
  if (subtotal == null || total == null) {
    return res.status(400).json({ message: "Faltan totales en la venta." })
  }
  if (!metodo_pago) {
    return res.status(400).json({ message: "Debe seleccionar un método de pago." })
  }

  try {
    // 1️⃣ Insertar factura
    const { data: nuevaFactura, error: errFactura } = await supabaseAdmin
      .from("facturas")
      .insert([{
        fecha_hora: new Date().toISOString(),
        id_empleado,
        total_bruto: subtotal,
        descuento_total: descuento || 0,
        total_neto: total,
        observaciones: cliente || null,
      }])
      .select("id_factura")
      .single()

    if (errFactura || !nuevaFactura) {
      console.error("❌ Error creando factura:", errFactura)
      return res.status(500).json({ message: "No se pudo crear la factura." })
    }

    const facturaId = nuevaFactura.id_factura

    // 2️⃣ Insertar líneas de productos en productos_facturas (mejor en batch)
    const detalles = productos.map((p) => ({
      id_factura: facturaId,
      id_producto: p.id,
      cantidad: p.cantidad,
      precio_unitario_venta: p.precio,
      subtotal_linea: p.cantidad * p.precio,
    }))

    const { error: errDetalles } = await supabaseAdmin
      .from("productos_facturas")
      .insert(detalles)

    if (errDetalles) {
      console.error("❌ Error insertando detalle:", errDetalles)
      return res.status(500).json({ message: "Error al registrar productos de la factura." })
    }

    // 3️⃣ Actualizar inventario por RPC (uno por cada producto)
    //    no vamos a romper la venta si un producto no puede actualizar stock
    for (const p of productos) {
      const resp = await supabaseAdmin.rpc("actualizar_stock", {
        id_prod: p.id,
        cantidad_vendida: p.cantidad,
      })
      if (resp.error) {
        console.error(`⚠️ Error actualizando stock de producto ${p.id}:`, resp.error)
      }
    }

    // 4️⃣ Registrar el pago
    let metodoId = null

    // Intentar buscar método exacto
    const { data: metodoData, error: metodoErr } = await supabaseAdmin
      .from("metodos_pago")
      .select("id_metodo")
      .eq("nombre_metodo", metodo_pago)
      .eq("activo", true)
      .single()

    if (!metodoErr && metodoData) {
      metodoId = metodoData.id_metodo
    } else {
      // Fallback → primer método activo
      const { data: metAlternativos } = await supabaseAdmin
        .from("metodos_pago")
        .select("id_metodo, nombre_metodo")
        .eq("activo", true)

      if (metAlternativos?.length > 0) {
        metodoId = metAlternativos[0].id_metodo
        console.warn(`⚠️ Método "${metodo_pago}" no encontrado, usando fallback: ${metAlternativos[0].nombre_metodo}`)
      } else {
        console.warn("⚠️ No hay métodos de pago activos; se omite registro de pago")
      }
    }

    if (metodoId) {
      const { error: errorPago } = await supabaseAdmin
        .from("facturas_pagos")
        .insert([{
          id_factura: facturaId,
          id_metodo: metodoId,
          monto_pagado: total,
        }])
      if (errorPago) console.error("⚠️ Error registrando pago:", errorPago)
    }

    res.status(201).json({
      message: "Factura registrada con éxito.",
      id_factura: facturaId,
    })
  } catch (err) {
    console.error("❌ catch general /api/facturas:", err)
    res.status(500).json({
      message: "Error interno al registrar la factura.",
      error: err.message,
    })
  }
})

// ===========================================================
// GET /api/facturas/ingresos-por-dia
// ===========================================================
router.get("/ingresos-por-dia", verifyToken, async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query

  try {
    let query = supabaseAdmin
      .from("facturas")
      .select("fecha_hora, total_neto")
      .order("fecha_hora", { ascending: true })

    if (fecha_desde) query = query.gte("fecha_hora", `${fecha_desde}T00:00:00`)
    if (fecha_hasta) query = query.lte("fecha_hora", `${fecha_hasta}T23:59:59`)

    const { data: facturas, error } = await query

    if (error) {
      console.error("❌ Error consultando ingresos:", error)
      return res.status(500).json({ message: "Error al obtener ingresos" })
    }

    const porDia = {}
    for (const f of facturas) {
      const fecha = new Date(f.fecha_hora).toISOString().split("T")[0]
      if (!porDia[fecha]) porDia[fecha] = { fecha, ingresos_totales: 0, total_ventas: 0 }
      porDia[fecha].ingresos_totales += Number(f.total_neto) || 0
      porDia[fecha].total_ventas++
    }

    const resultado = Object.values(porDia)
      .map((item) => ({
        fecha: item.fecha,
        ingresos_totales: item.ingresos_totales,
        total_ventas: item.total_ventas,
        promedio_venta: item.total_ventas > 0 ? item.ingresos_totales / item.total_ventas : 0,
      }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

    res.json(resultado)
  } catch (err) {
    console.error("❌ Error en /ingresos-por-dia:", err)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// ===========================================================
// GET /api/facturas
// filtros: fecha_desde, fecha_hasta, id_empleado
// ===========================================================
router.get("/", verifyToken, async (req, res) => {
  const { fecha_desde, fecha_hasta, id_empleado } = req.query

  try {
    let query = supabaseAdmin
      .from("facturas")
      .select(`
        *,
        empleados:empleados(nombres, apellidos)
      `)
      .order("fecha_hora", { ascending: false })

    if (fecha_desde) query = query.gte("fecha_hora", `${fecha_desde}T00:00:00`)
    if (fecha_hasta) query = query.lte("fecha_hora", `${fecha_hasta}T23:59:59`)
    if (id_empleado) query = query.eq("id_empleado", id_empleado)

    const { data: facturas, error } = await query

    if (error) {
      console.error("❌ Error consultando facturas:", error)
      return res.status(500).json({ message: "Error al obtener facturas" })
    }

    const resp = facturas.map((f) => ({
      id_factura: f.id_factura,
      fecha_hora: f.fecha_hora,
      empleado_nombres: f.empleados ? `${f.empleados.nombres} ${f.empleados.apellidos}` : null,
      total_bruto: Number(f.total_bruto),
      descuento_total: Number(f.descuento_total),
      total_neto: Number(f.total_neto),
      observaciones: f.observaciones,
    }))

    res.json(resp)
  } catch (err) {
    console.error("❌ Error en GET /api/facturas:", err)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// ===========================================================
// GET /api/facturas/:id/detalle
// ===========================================================
router.get("/:id/detalle", verifyToken, async (req, res) => {
  const { id } = req.params

  try {
    const { data: factura, error: errFactura } = await supabaseAdmin
      .from("facturas")
      .select(`
        *,
        empleados:empleados(nombres, apellidos)
      `)
      .eq("id_factura", id)
      .single()

    if (errFactura || !factura) {
      return res.status(404).json({ message: "Factura no encontrada" })
    }

    const { data: productos, error: errProd } = await supabaseAdmin
      .from("productos_facturas")
      .select(`
        *,
        productos:productos(nombre_producto)
      `)
      .eq("id_factura", id)

    if (errProd) {
      console.error("❌ Error consultando productos de factura:", errProd)
      return res.status(500).json({ message: "Error al obtener productos de la factura" })
    }

    res.json({
      factura: {
        id_factura: factura.id_factura,
        fecha_hora: factura.fecha_hora,
        empleado_nombres: factura.empleados 
          ? `${factura.empleados.nombres} ${factura.empleados.apellidos}`
          : null,
        total_bruto: Number(factura.total_bruto),
        descuento_total: Number(factura.descuento_total),
        total_neto: Number(factura.total_neto),
        observaciones: factura.observaciones,
      },
      productos: productos.map((p) => ({
        id_producto: p.id_producto,
        nombre_producto: p.productos?.nombre_producto,
        cantidad: p.cantidad,
        precio_unitario_venta: Number(p.precio_unitario_venta),
        subtotal_linea: Number(p.subtotal_linea),
      })),
    })
  } catch (err) {
    console.error("❌ Error en GET /api/facturas/:id/detalle:", err)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

export default router
