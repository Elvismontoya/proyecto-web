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
  const id_empleado = req.user.id_empleado; // viene del token JWT

  // Validaciones básicas
  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ message: "No hay productos en la venta." });
  }

  if (subtotal == null || total == null) {
    return res.status(400).json({ message: "Faltan totales en la venta." });
  }

  try {
    // 1️⃣ Crear la factura en tabla 'facturas'
    const { data: nuevaFactura, error: errFactura } = await supabase
      .from("facturas")
      .insert([
        {
          fecha_hora: new Date().toISOString(),
          id_empleado: id_empleado,
          total_bruto: subtotal,          // suma sin descuento
          descuento_total: descuento || 0,
          total_neto: total,              // total final
          observaciones: cliente || null  // guardamos nombre del cliente como nota
        }
      ])
      .select("id_factura")
      .single();

    if (errFactura || !nuevaFactura) {
      console.error("Error creando factura:", errFactura);
      return res.status(500).json({ message: "No se pudo crear la factura." });
    }

    const facturaId = nuevaFactura.id_factura;

    // 2️⃣ Insertar cada producto en 'productos_facturas'
    for (const p of productos) {
      // p = { id, cantidad, precio }
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
          message: "No se pudo insertar el detalle de la factura."
        });
      }

      // 3️⃣ Actualizar inventario (restar stock)
      const { error: errStock } = await supabase.rpc("actualizar_stock", {
        id_prod: p.id,
        cantidad_vendida: cantidadVendida
      });

      if (errStock) {
        console.error("Error actualizando stock:", errStock);
        // no hacemos return 500 porque la venta ya existe,
        // pero dejamos log para que lo revises
      }
    }

    // 4️⃣ Registrar el pago en 'facturas_pagos'
    // Buscamos el id_metodo basado en el texto que nos mandó el front ('efectivo', etc.)
    const { data: metodoData, error: metodoErr } = await supabase
      .from("metodos_pago")
      .select("id_metodo")
      .eq("nombre_metodo", metodo_pago)
      .single();

    if (metodoErr) {
      console.warn("No se encontró método de pago:", metodoErr);
      // si no encontró método de pago, simplemente no insertamos pago
    } else {
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
        // no cortamos, ya se creó factura igual
      }
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

export default router;
