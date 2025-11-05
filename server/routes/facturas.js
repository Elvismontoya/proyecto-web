import express from "express";
import { supabase } from "../supabaseClient.js";
import { verifyToken } from "../authMiddleware.js";

const router = express.Router();

// POST /api/facturas
// Body esperado:
// {
//   cliente: "Juan Pérez",
//   subtotal: 25000,
//   descuento: 2000,
//   total: 23000,
//   metodo_pago: "efectivo",
//   productos: [
//      { id: 1, cantidad: 2, precio: 5000 },
//      { id: 4, cantidad: 1, precio: 15000 }
//   ]
// }

router.post("/", verifyToken, async (req, res) => {
  const { cliente, subtotal, descuento, total, metodo_pago, productos } = req.body;
  const id_empleado = req.user.id_empleado;

  // Validaciones básicas
  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ message: "No hay productos en la venta." });
  }

  if (subtotal == null || total == null) {
    return res.status(400).json({ message: "Faltan totales en la venta." });
  }

  // Validar que se seleccionó un método de pago
  if (!metodo_pago) {
    return res.status(400).json({ message: "Debe seleccionar un método de pago." });
  }

  try {
    // 1️⃣ Crear la factura
    const { data: nuevaFactura, error: errFactura } = await supabase
      .from("facturas")
      .insert([
        {
          fecha_hora: new Date().toISOString(),
          id_empleado: id_empleado,
          total_bruto: subtotal,
          descuento_total: descuento || 0,
          total_neto: total,
          observaciones: cliente || null
        }
      ])
      .select("id_factura")
      .single();

    if (errFactura || !nuevaFactura) {
      console.error("Error creando factura:", errFactura);
      return res.status(500).json({ message: "No se pudo crear la factura." });
    }

    const facturaId = nuevaFactura.id_factura;

    // 2️⃣ Insertar productos en la factura
    for (const p of productos) {
      const cantidadVendida = p.cantidad;
      const precioUnitario = p.precio;
      const subtotalLinea = cantidadVendida * precioUnitario;

      const { error: errDet } = await supabase
        .from("productos_facturas")
        .insert([
          {
            id_factura: facturaId,
            id_producto: p.id,
            cantidad: cantidadVendida,
            precio_unitario_venta: precioUnitario,
            subtotal_linea: subtotalLinea
          }
        ]);

      if (errDet) {
        console.error("Error insertando detalle:", errDet);
        return res.status(500).json({
          message: "No se pudo insertar el detalle de la factura.",
          error: errDet.message
        });
      }

      // 3️⃣ Actualizar inventario
      const { error: errStock } = await supabase.rpc("actualizar_stock", {
        id_prod: p.id,
        cantidad_vendida: cantidadVendida
      });

      if (errStock) {
        console.error("Error actualizando stock:", errStock);
      }
    }

    // 4️⃣ Registrar el pago - CON MEJOR MANEJO DE ERRORES
    try {
      console.log(`Buscando método de pago: "${metodo_pago}"`);
      
      const { data: metodoData, error: metodoErr } = await supabase
        .from("metodos_pago")
        .select("id_metodo")
        .eq("nombre_metodo", metodo_pago)
        .eq("activo", true)
        .single();

      if (metodoErr || !metodoData) {
        console.warn(`Método de pago no encontrado: "${metodo_pago}". Buscando alternativas...`);
        
        // CORRECCIÓN: Quité la comilla extra después de "true"
        const { data: metodosAlternativos, error: altErr } = await supabase
          .from("metodos_pago")
          .select("id_metodo, nombre_metodo")
          .eq("activo", true); // ← AQUÍ ESTABA EL ERROR

        if (altErr || !metodosAlternativos || metodosAlternativos.length === 0) {
          console.error("No hay métodos de pago activos en la base de datos");
          // Continuar sin registrar pago
        } else {
          console.log("Métodos de pago disponibles:", metodosAlternativos);
          
          // Usar el primer método disponible como fallback
          const metodoFallback = metodosAlternativos[0];
          console.log(`Usando método fallback: ${metodoFallback.nombre_metodo}`);
          
          const { error: errPago } = await supabase
            .from("facturas_pagos")
            .insert([
              {
                id_factura: facturaId,
                id_metodo: metodoFallback.id_metodo,
                monto_pagado: total
              }
            ]);

          if (errPago) {
            console.error("Error registrando pago con fallback:", errPago);
          } else {
            console.log("Pago registrado exitosamente con método fallback");
          }
        }
      } else {
        // Método encontrado correctamente
        console.log(`Método de pago encontrado: ID ${metodoData.id_metodo}`);
        
        const { error: errPago } = await supabase
          .from("facturas_pagos")
          .insert([
            {
              id_factura: facturaId,
              id_metodo: metodoData.id_metodo,
              monto_pagado: total
            }
          ]);

        if (errPago) {
          console.error("Error registrando pago:", errPago);
        } else {
          console.log("Pago registrado exitosamente");
        }
      }
    } catch (pagoError) {
      console.error("Error en proceso de pago:", pagoError);
      // No impedimos que la factura se cree por un error en el pago
    }

    // 5️⃣ Responder OK
    res.status(201).json({
      message: "Factura registrada con éxito.",
      id_factura: facturaId
    });
  } catch (err) {
    console.error("catch general /api/facturas:", err);
    res.status(500).json({
      message: "Error interno al registrar la factura.",
      error: err.message
    });
  }
});

// ============================================================
// NUEVOS ENDPOINTS - SIN ALTERAR EL CÓDIGO EXISTENTE
// ============================================================

// GET /api/facturas/ingresos-por-dia
// Obtiene ingresos agrupados por día
// routes/facturas.js - AGREGAR ESTE CÓDIGO AL FINAL DEL ARCHIVO

// GET /api/facturas/ingresos-por-dia - CORREGIDO
router.get("/ingresos-por-dia", verifyToken, async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query;

  try {
    // Consulta base para obtener facturas
    let query = supabase
      .from("facturas")
      .select("fecha_hora, total_neto")
      .order("fecha_hora", { ascending: true });

    // Aplicar filtros de fecha si existen
    if (fecha_desde) {
      query = query.gte("fecha_hora", `${fecha_desde}T00:00:00`);
    }
    if (fecha_hasta) {
      query = query.lte("fecha_hora", `${fecha_hasta}T23:59:59`);
    }

    const { data: facturas, error } = await query;

    if (error) {
      console.error("Error consultando facturas para ingresos:", error);
      return res.status(500).json({ message: "Error al obtener ingresos" });
    }

    // Agrupar por día de manera más robusta
    const ingresosPorDia = {};
    
    facturas.forEach(factura => {
      const fechaObj = new Date(factura.fecha_hora);
      const fecha = fechaObj.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!ingresosPorDia[fecha]) {
        ingresosPorDia[fecha] = {
          fecha: fecha,
          ingresos_totales: 0,
          total_ventas: 0
        };
      }
      
      ingresosPorDia[fecha].ingresos_totales += Number(factura.total_neto) || 0;
      ingresosPorDia[fecha].total_ventas += 1;
    });

    // Convertir a array y calcular promedios
    const resultado = Object.values(ingresosPorDia)
      .map(item => ({
        fecha: item.fecha,
        ingresos_totales: item.ingresos_totales,
        total_ventas: item.total_ventas,
        promedio_venta: item.total_ventas > 0 ? item.ingresos_totales / item.total_ventas : 0
      }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Más reciente primero

    console.log(`📊 Ingresos por día: ${resultado.length} días encontrados`);
    res.json(resultado);
  } catch (err) {
    console.error("Error en /api/facturas/ingresos-por-dia:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// GET /api/facturas
// Obtiene todas las facturas con filtros
router.get("/", verifyToken, async (req, res) => {
  const { fecha_desde, fecha_hasta, id_empleado } = req.query;

  try {
    let query = supabase
      .from("facturas")
      .select(`
        *,
        empleados:empleados(nombres, apellidos)
      `)
      .order("fecha_hora", { ascending: false });

    // Aplicar filtros
    if (fecha_desde) {
      query = query.gte("fecha_hora", `${fecha_desde}T00:00:00`);
    }
    if (fecha_hasta) {
      query = query.lte("fecha_hora", `${fecha_hasta}T23:59:59`);
    }
    if (id_empleado) {
      query = query.eq("id_empleado", id_empleado);
    }

    const { data: facturas, error } = await query;

    if (error) {
      console.error("Error consultando facturas:", error);
      return res.status(500).json({ message: "Error al obtener facturas" });
    }

    // Formatear los datos
    const facturasFormateadas = facturas.map(factura => ({
      id_factura: factura.id_factura,
      fecha_hora: factura.fecha_hora,
      empleado_nombres: factura.empleados ? 
        `${factura.empleados.nombres} ${factura.empleados.apellidos}` : null,
      total_bruto: Number(factura.total_bruto),
      descuento_total: Number(factura.descuento_total),
      total_neto: Number(factura.total_neto),
      observaciones: factura.observaciones
    }));

    res.json(facturasFormateadas);
  } catch (err) {
    console.error("Error en GET /api/facturas:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// GET /api/facturas/:id/detalle
// Obtiene el detalle completo de una factura
router.get("/:id/detalle", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener datos de la factura
    const { data: factura, error: errorFactura } = await supabase
      .from("facturas")
      .select(`
        *,
        empleados:empleados(nombres, apellidos)
      `)
      .eq("id_factura", id)
      .single();

    if (errorFactura || !factura) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    // Obtener productos de la factura
    const { data: productos, error: errorProductos } = await supabase
      .from("productos_facturas")
      .select(`
        *,
        productos:productos(nombre_producto)
      `)
      .eq("id_factura", id);

    if (errorProductos) {
      console.error("Error consultando productos:", errorProductos);
      return res.status(500).json({ message: "Error al obtener productos de la factura" });
    }

    // Formatear respuesta
    const respuesta = {
      factura: {
        id_factura: factura.id_factura,
        fecha_hora: factura.fecha_hora,
        empleado_nombres: factura.empleados ? 
          `${factura.empleados.nombres} ${factura.empleados.apellidos}` : null,
        total_bruto: Number(factura.total_bruto),
        descuento_total: Number(factura.descuento_total),
        total_neto: Number(factura.total_neto),
        observaciones: factura.observaciones
      },
      productos: productos.map(prod => ({
        id_producto: prod.id_producto,
        nombre_producto: prod.productos?.nombre_producto,
        cantidad: prod.cantidad,
        precio_unitario_venta: Number(prod.precio_unitario_venta),
        subtotal_linea: Number(prod.subtotal_linea)
      }))
    };

    res.json(respuesta);
  } catch (err) {
    console.error("Error en GET /api/facturas/:id/detalle:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
