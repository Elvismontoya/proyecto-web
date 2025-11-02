import express from 'express';
import { supabase } from '../supabaseClient.js';
import { verifyToken, requireAdmin } from '../authMiddleware.js';

const router = express.Router();

/* ===========================================================
   GET /api/productos
   Trae todos los productos activos + su stock
   Acceso: cualquier empleado logueado (admin o cajero)
   =========================================================== */
router.get('/', verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from('productos')
    .select(`
      id_producto,
      nombre_producto,
      precio_venta_unitario,
      img,
      permite_toppings,
      activo,
      inventario:inventario!inventario_id_producto_fkey (
        stock_actual
      )
    `)
    .eq('activo', true);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const adaptado = data.map(p => ({
    id: p.id_producto,
    nombre: p.nombre_producto,
    precio: Number(p.precio_venta_unitario),
    img: p.img || '',
    permiteToppings: !!p.permite_toppings,
    stock: p.inventario?.stock_actual ?? 0
  }));

  res.json(adaptado);
});


/* ===========================================================
   POST /api/productos
   Crea un producto nuevo + inventario inicial
   Acceso: SOLO admin
   Body esperado:
   { nombre, precio, stock, img, permiteToppings }
   =========================================================== */
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { nombre, precio, stock, img, permiteToppings } = req.body;

  if (!nombre || precio == null) {
    return res
      .status(400)
      .json({ message: 'Nombre y precio son obligatorios' });
  }

  // 1. Crear producto
  const { data: nuevoProd, error: errProd } = await supabase
    .from('productos')
    .insert([
      {
        nombre_producto: nombre,
        precio_venta_unitario: precio,
        img,
        permite_toppings: !!permiteToppings,
        activo: true
      }
    ])
    .select('id_producto')
    .single();

  if (errProd || !nuevoProd) {
    console.error(errProd);
    return res
      .status(500)
      .json({ message: 'Error creando producto' });
  }

  const idProducto = nuevoProd.id_producto;

  // 2. Crear inventario
  const { error: errInv } = await supabase
    .from('inventario')
    .insert([
      {
        id_producto: idProducto,
        stock_actual: stock ?? 0,
        stock_minimo: 0
      }
    ]);

  if (errInv) {
    console.error('Error inventario inicial:', errInv);
    // no corto aquí porque el producto sí existe,
    // pero deberías revisar logs
  }

  res.json({
    message: 'Producto creado',
    id: idProducto
  });
});

/* ===========================================================
   PUT /api/productos/:id
   Actualiza info y stock
   Acceso: SOLO admin
   Body esperado:
   { nombre, precio, stock, img, permiteToppings }
   =========================================================== */
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, stock, img, permiteToppings } = req.body;

  // 1. update en productos
  const { error: errUpdProd } = await supabase
    .from('productos')
    .update({
      nombre_producto: nombre,
      precio_venta_unitario: precio,
      img,
      permite_toppings: !!permiteToppings
    })
    .eq('id_producto', id);

  if (errUpdProd) {
    console.error(errUpdProd);
    return res
      .status(500)
      .json({ message: 'Error actualizando producto' });
  }

  // 2. update en inventario
  if (stock != null) {
    const { error: errUpdInv } = await supabase
      .from('inventario')
      .update({
        stock_actual: stock,
        ultima_actualizacion: new Date().toISOString()
      })
      .eq('id_producto', id);

    if (errUpdInv) {
      // si falla el update, intento insertarlo por si no existía stock aún
      const { error: errInsInv } = await supabase
        .from('inventario')
        .insert([
          {
            id_producto: id,
            stock_actual: stock,
            stock_minimo: 0,
            ultima_actualizacion: new Date().toISOString()
          }
        ]);

      if (errInsInv) {
        console.error('Error creando inventario faltante:', errInsInv);
      }
    }
  }

  res.json({ message: 'Producto actualizado' });
});

/* ===========================================================
   DELETE /api/productos/:id
   Desactiva el producto (soft delete)
   Acceso: SOLO admin
   =========================================================== */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('productos')
    .update({ activo: false })
    .eq('id_producto', id);

  if (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: 'No se pudo desactivar el producto' });
  }

  res.json({ message: 'Producto desactivado' });
});

export default router;
