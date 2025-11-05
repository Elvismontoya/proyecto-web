import express from 'express';
import { supabase } from '../supabaseClient.js';
import { verifyToken, requireAdmin } from '../authMiddleware.js';

const router = express.Router();

/* ===========================================================
   GET /api/productos
   Trae todos los productos activos + su stock
   Acceso: cualquier empleado logueado (admin o cajero)
   =========================================================== */

// GET /api/productos - Para la caja (con categorías)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        id_producto,
        nombre_producto,
        precio_venta_unitario,
        img,
        permite_toppings,
        activo,
        categorias:categorias!productos_id_categoria_fkey (
          id_categoria,
          nombre,
          descripcion
        ),
        inventario:inventario!inventario_id_producto_fkey (
          stock_actual
        )
      `)
      .eq('activo', true)
      .order('id_categoria');

    if (error) {
      console.error('Error consultando productos:', error);
      return res.status(500).json({ message: error.message });
    }

    // Agrupar por categorías para la caja
    const productosPorCategoria = {};
    
    data.forEach(p => {
      const categoriaId = p.categorias?.id_categoria || 0;
      const categoriaNombre = p.categorias?.nombre || 'Sin categoría';
      
      if (!productosPorCategoria[categoriaId]) {
        productosPorCategoria[categoriaId] = {
          id: categoriaId,
          nombre: categoriaNombre,
          productos: []
        };
      }

      productosPorCategoria[categoriaId].productos.push({
        id: p.id_producto,
        nombre: p.nombre_producto,
        precio: Number(p.precio_venta_unitario),
        img: p.img || '',
        permiteToppings: !!p.permite_toppings,
        stock: p.inventario?.stock_actual ?? 0,
        id_categoria: categoriaId
      });
    });

    res.json(Object.values(productosPorCategoria));
  } catch (err) {
    console.error('Error en GET /api/productos:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


/* ===========================================================
   POST /api/productos
   Crea un producto nuevo + inventario inicial
   Acceso: SOLO admin
   Body esperado:
   { nombre, precio, stock, img, permiteToppings }
   =========================================================== */
// Modificar el POST /api/productos
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { nombre, precio, stock, img, permiteToppings, id_categoria } = req.body;

  if (!nombre || precio == null) {
    return res
      .status(400)
      .json({ message: 'Nombre y precio son obligatorios' });
  }

  // Validar que la categoría existe si se proporciona
  if (id_categoria) {
    const { data: categoria, error: catError } = await supabase
      .from('categorias')
      .select('id_categoria')
      .eq('id_categoria', id_categoria)
      .eq('activo', true)
      .single();

    if (catError || !categoria) {
      return res.status(400).json({ message: 'Categoría no válida' });
    }
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
        id_categoria: id_categoria || null,
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
  }

  res.json({
    message: 'Producto creado',
    id: idProducto
  });
});

// Modificar el PUT /api/productos/:id
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, stock, img, permiteToppings, id_categoria } = req.body;

  // Validar categoría si se proporciona
  if (id_categoria) {
    const { data: categoria, error: catError } = await supabase
      .from('categorias')
      .select('id_categoria')
      .eq('id_categoria', id_categoria)
      .eq('activo', true)
      .single();

    if (catError || !categoria) {
      return res.status(400).json({ message: 'Categoría no válida' });
    }
  }

  // 1. update en productos
  const { error: errUpdProd } = await supabase
    .from('productos')
    .update({
      nombre_producto: nombre,
      precio_venta_unitario: precio,
      img,
      permite_toppings: !!permiteToppings,
      id_categoria: id_categoria || null
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
/* ===========================================================
   DELETE /api/productos/:id
   Desactiva el producto (soft delete) - NO elimina físicamente
   Acceso: SOLO admin
   =========================================================== */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si el producto existe
    const { data: producto, error: errorProducto } = await supabase
      .from('productos')
      .select('id_producto, nombre_producto')
      .eq('id_producto', id)
      .single();

    if (errorProducto || !producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Hacer soft delete - marcar como inactivo
    const { error } = await supabase
      .from('productos')
      .update({ 
        activo: false,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id_producto', id);

    if (error) {
      console.error('Error en soft delete:', error);
      return res.status(500).json({ message: 'No se pudo desactivar el producto' });
    }

    // Registrar en auditoría
    try {
      await supabase
        .from('auditoria')
        .insert([
          {
            id_empleado: req.user.id_empleado,
            accion: 'DELETE',
            tabla_afectada: 'productos',
            id_registro_afectado: id,
            descripcion: `Producto desactivado: ${producto.nombre_producto}`
          }
        ]);
    } catch (auditError) {
      console.error('Error registrando auditoría:', auditError);
    }

    res.json({ 
      message: 'Producto desactivado correctamente',
      producto: producto.nombre_producto
    });
  } catch (err) {
    console.error('Error en DELETE /api/productos:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/productos/inactivos - Obtener productos desactivados
router.get('/inactivos', verifyToken, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('productos')
    .select(`
      id_producto,
      nombre_producto,
      precio_venta_unitario,
      img,
      permite_toppings,
      activo,
      fecha_creacion,
      fecha_actualizacion,
      categorias:categorias!productos_id_categoria_fkey (
        id_categoria,
        nombre
      ),
      inventario:inventario!inventario_id_producto_fkey (
        stock_actual
      )
    `)
    .eq('activo', false)
    .order('fecha_actualizacion', { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const adaptado = data.map(p => ({
    id: p.id_producto,
    nombre: p.nombre_producto,
    precio: Number(p.precio_venta_unitario),
    img: p.img || '',
    permiteToppings: !!p.permite_toppings,
    stock: p.inventario?.stock_actual ?? 0,
    categoria: p.categorias?.nombre || 'Sin categoría',
    fecha_desactivacion: p.fecha_actualizacion
  }));

  res.json(adaptado);
});

// PUT /api/productos/:id/reactivar - Reactivar producto
router.put('/:id/reactivar', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: producto, error: errorProducto } = await supabase
      .from('productos')
      .select('id_producto, nombre_producto')
      .eq('id_producto', id)
      .single();

    if (errorProducto || !producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const { error } = await supabase
      .from('productos')
      .update({ 
        activo: true,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id_producto', id);

    if (error) {
      console.error('Error reactivando producto:', error);
      return res.status(500).json({ message: 'No se pudo reactivar el producto' });
    }

    // Registrar en auditoría
    try {
      await supabase
        .from('auditoria')
        .insert([
          {
            id_empleado: req.user.id_empleado,
            accion: 'UPDATE',
            tabla_afectada: 'productos',
            id_registro_afectado: id,
            descripcion: `Producto reactivado: ${producto.nombre_producto}`
          }
        ]);
    } catch (auditError) {
      console.error('Error registrando auditoría:', auditError);
    }

    res.json({ 
      message: 'Producto reactivado correctamente',
      producto: producto.nombre_producto
    });
  } catch (err) {
    console.error('Error en PUT /api/productos/:id/reactivar:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
