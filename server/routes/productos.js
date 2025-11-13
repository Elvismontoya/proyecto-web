// server/routes/productos.js
import express from 'express'
import { supabaseAdmin } from '../db/supabase.js'
import { verifyToken, requireAdmin } from '../authMiddleware.js'

const router = express.Router()

/* ===========================================================
   GET /api/productos
   Activos + categoría + stock (para caja)
   =========================================================== */
router.get('/', verifyToken, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('productos')
      .select(`
        id_producto,
        nombre_producto,
        precio_venta_unitario,
        img,
        permite_toppings,
        activo,
        id_categoria,
        categorias:categorias!productos_id_categoria_fkey(
          id_categoria,
          nombre,
          descripcion
        ),
        inventario:inventario!inventario_id_producto_fkey(
          stock_actual
        )
      `)
      .eq('activo', true)
      .order('id_categoria', { ascending: true })

    if (error) {
      console.error('Error consultando productos:', error)
      return res.status(500).json({ message: 'Error al obtener productos' })
    }

    // Agrupar por categorías
    const porCategoria = {}
    for (const p of (data ?? [])) {
      const catId = p.categorias?.id_categoria ?? 0
      const catNombre = p.categorias?.nombre ?? 'Sin categoría'
      if (!porCategoria[catId]) {
        porCategoria[catId] = { id: catId, nombre: catNombre, productos: [] }
      }
      porCategoria[catId].productos.push({
        id: p.id_producto,
        nombre: p.nombre_producto,
        precio: Number(p.precio_venta_unitario),
        img: p.img || '',
        permiteToppings: !!p.permite_toppings,
        stock: p.inventario?.stock_actual ?? 0,
        id_categoria: catId
      })
    }

    res.json(Object.values(porCategoria))
  } catch (err) {
    console.error('Error en GET /api/productos:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

/* ===========================================================
   POST /api/productos
   Crea producto + inventario inicial
   Body: { nombre, precio, stock, img, permiteToppings, id_categoria? }
   =========================================================== */
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { nombre, precio, stock, img, permiteToppings, id_categoria } = req.body

  if (!nombre || precio == null) {
    return res.status(400).json({ message: 'Nombre y precio son obligatorios' })
  }

  try {
    // Validar categoría si llega
    if (id_categoria) {
      const { data: categoria, error: catError } = await supabaseAdmin
        .from('categorias')
        .select('id_categoria')
        .eq('id_categoria', id_categoria)
        .eq('activo', true)
        .single()
      if (catError || !categoria) {
        return res.status(400).json({ message: 'Categoría no válida' })
      }
    }

    // 1) Crear producto
    const { data: nuevoProd, error: errProd } = await supabaseAdmin
      .from('productos')
      .insert([{
        nombre_producto: nombre,
        precio_venta_unitario: precio,
        img: img || null,
        permite_toppings: !!permiteToppings,
        id_categoria: id_categoria || null,
        activo: true
      }])
      .select('id_producto')
      .single()

    if (errProd || !nuevoProd) {
      console.error('Error creando producto:', errProd)
      return res.status(500).json({ message: 'Error creando producto' })
    }

    // 2) Inventario inicial
    const { error: errInv } = await supabaseAdmin
      .from('inventario')
      .insert([{
        id_producto: nuevoProd.id_producto,
        stock_actual: stock ?? 0,
        stock_minimo: 0,
        ultima_actualizacion: new Date().toISOString()
      }])

    if (errInv) console.error('Error inventario inicial:', errInv)

    res.json({ message: 'Producto creado', id: nuevoProd.id_producto })
  } catch (err) {
    console.error('Error en POST /api/productos:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

/* ===========================================================
   PUT /api/productos/:id
   Actualiza datos y (opcional) stock e id_categoria
   =========================================================== */
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { nombre, precio, stock, img, permiteToppings, id_categoria } = req.body

  try {
    // Validar categoría si llega
    if (id_categoria) {
      const { data: categoria, error: catError } = await supabaseAdmin
        .from('categorias')
        .select('id_categoria')
        .eq('id_categoria', id_categoria)
        .eq('activo', true)
        .single()
      if (catError || !categoria) {
        return res.status(400).json({ message: 'Categoría no válida' })
      }
    }

    // 1) Update producto
    const { error: errUpdProd } = await supabaseAdmin
      .from('productos')
      .update({
        nombre_producto: nombre,
        precio_venta_unitario: precio,
        img: img || null,
        permite_toppings: !!permiteToppings,
        id_categoria: id_categoria ?? null,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id_producto', id)

    if (errUpdProd) {
      console.error('Error actualizando producto:', errUpdProd)
      return res.status(500).json({ message: 'Error actualizando producto' })
    }

    // 2) Update/Insert inventario si llega stock
    if (stock != null) {
      const { data: inv, error: errUpdInv } = await supabaseAdmin
        .from('inventario')
        .update({
          stock_actual: stock,
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id_producto', id)
        .select('id_producto')
        .single()

      if (errUpdInv) {
        // Si no existe inventario, crearlo
        const { error: errInsInv } = await supabaseAdmin
          .from('inventario')
          .insert([{
            id_producto: id,
            stock_actual: stock,
            stock_minimo: 0,
            ultima_actualizacion: new Date().toISOString()
          }])
        if (errInsInv) console.error('Error creando inventario faltante:', errInsInv)
      }
    }

    res.json({ message: 'Producto actualizado' })
  } catch (err) {
    console.error('Error en PUT /api/productos/:id:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

/* ===========================================================
   DELETE /api/productos/:id (borrado definitivo SI no tiene facturas)
   =========================================================== */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  console.log('DELETE /api/productos/:id -> id recibido =', id, 'tipo:', typeof id)

  try {
    // 0) Verificar si el producto tiene facturas asociadas
    const { count: facturasCount, error: facturasErr } = await supabaseAdmin
      .from('productos_facturas')
      .select('id_detalle', { count: 'exact', head: true })
      .eq('id_producto', id)

    if (facturasErr) {
      console.error('Error contando facturas del producto:', facturasErr)
      return res.status(500).json({ message: 'Error verificando facturas asociadas al producto' })
    }

    if ((facturasCount ?? 0) > 0) {
      // 💡 Aquí puedes decidir: solo error, o hacer soft delete
      return res.status(400).json({
        message:
          'No se puede eliminar el producto porque ya fue usado en facturas. ' +
          'Solo se pueden eliminar productos que no tengan ventas registradas.'
      })
    }

    // 1) Verificar que exista el producto
    const { data: producto, error: errorProducto } = await supabaseAdmin
      .from('productos')
      .select('id_producto, nombre_producto')
      .eq('id_producto', id)
      .single()

    console.log('Producto encontrado antes de borrar:', producto, 'error:', errorProducto)

    if (errorProducto || !producto) {
      return res.status(404).json({ message: 'Producto no encontrado' })
    }

    // 2) BORRADO REAL + devolver lo borrado
    const { data: deleted, error: errorDelete } = await supabaseAdmin
      .from('productos')
      .delete()
      .eq('id_producto', id)
      .select('id_producto, nombre_producto')

    console.log('Resultado DELETE supabase:', { deleted, errorDelete })

    if (errorDelete) {
      console.error('Error eliminando producto:', errorDelete)
      return res.status(500).json({ message: 'No se pudo eliminar el producto' })
    }

    if (!deleted || deleted.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado al eliminar' })
    }

    // 3) Auditoría (no bloqueante)
    try {
      await supabaseAdmin
        .from('auditoria')
        .insert([{
          id_empleado: req.user.id_empleado,
          accion: 'DELETE',
          tabla_afectada: 'productos',
          id_registro_afectado: id,
          descripcion: `Producto eliminado definitivamente: ${producto.nombre_producto}`
        }])
    } catch (auditError) {
      console.error('Error registrando auditoría:', auditError)
    }

    return res.json({
      message: 'Producto eliminado correctamente',
      producto: producto.nombre_producto
    })
  } catch (err) {
    console.error('Error en DELETE /api/productos/:id:', err)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
})

export default router
