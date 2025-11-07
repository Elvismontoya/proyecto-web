import express from 'express'
import { supabaseAdmin } from '../db/supabase.js'
import { verifyToken, requireAdmin } from '../authMiddleware.js'

const router = express.Router()

// GET /api/inventario - Obtener inventario con info de producto y categoría
router.get('/', verifyToken, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('inventario')
      .select(`
        id_producto,
        stock_actual,
        stock_minimo,
        ultima_actualizacion,
        productos:productos!inner(
          id_producto,
          nombre_producto,
          precio_venta_unitario,
          img,
          categorias:categorias!productos_id_categoria_fkey(nombre)
        )
      `)
      .order('stock_actual', { ascending: true })

    if (error) {
      console.error('Error consultando inventario:', error)
      return res.status(500).json({ message: 'Error al obtener inventario' })
    }

    const inventarioFormateado = (data ?? []).map(item => ({
      id_producto: item.id_producto,
      nombre_producto: item.productos.nombre_producto,
      categoria: item.productos.categorias?.nombre || 'Sin categoría',
      precio: Number(item.productos.precio_venta_unitario),
      img: item.productos.img || '',
      stock_actual: item.stock_actual,
      stock_minimo: item.stock_minimo,
      ultima_actualizacion: item.ultima_actualizacion,
      estado:
        item.stock_actual <= 0 ? 'agotado' :
        item.stock_actual <= item.stock_minimo ? 'bajo' : 'normal'
    }))

    res.json(inventarioFormateado)
  } catch (err) {
    console.error('Error en /api/inventario:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// PUT /api/inventario/:id - Actualizar stock
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { stock_actual, stock_minimo } = req.body

  try {
    const { data, error } = await supabaseAdmin
      .from('inventario')
      .update({
        stock_actual,
        stock_minimo: stock_minimo || 0,
        ultima_actualizacion: new Date().toISOString()
      })
      .eq('id_producto', id)
      .select(`
        *,
        productos:productos!inner(nombre_producto)
      `)
      .single()

    if (error) {
      console.error('Error actualizando inventario:', error)
      return res.status(500).json({ message: 'Error al actualizar inventario' })
    }

    // Auditoría (no bloqueante)
    try {
      await supabaseAdmin
        .from('auditoria')
        .insert([{
          id_empleado: req.user.id_empleado,
          accion: 'UPDATE',
          tabla_afectada: 'inventario',
          id_registro_afectado: id,
          descripcion: `Stock actualizado: ${data.productos.nombre_producto} - Nuevo stock: ${stock_actual}`
        }])
    } catch (auditError) {
      console.error('Error registrando auditoría:', auditError)
    }

    res.json({ message: 'Inventario actualizado correctamente', inventario: data })
  } catch (err) {
    console.error('Error en PUT /api/inventario:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// GET /api/inventario/alertas - Productos con stock <= mínimo (JS)
router.get('/alertas', verifyToken, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('inventario')
      .select(`
        id_producto,
        stock_actual,
        stock_minimo,
        productos:productos!inner(
          id_producto,
          nombre_producto,
          categorias:categorias!productos_id_categoria_fkey(nombre)
        )
      `)
      .order('stock_actual', { ascending: true })

    if (error) {
      console.error('Error consultando alertas:', error)
      return res.status(500).json({ message: 'Error al obtener alertas' })
    }

    const alertas = (data ?? [])
      .filter(item => item.stock_actual <= item.stock_minimo)
      .map(item => ({
        id_producto: item.id_producto,
        nombre_producto: item.productos.nombre_producto,
        categoria: item.productos.categorias?.nombre || 'Sin categoría',
        stock_actual: item.stock_actual,
        stock_minimo: item.stock_minimo,
        diferencia: item.stock_actual - item.stock_minimo,
        estado: item.stock_actual <= 0 ? 'agotado' : 'bajo'
      }))

    res.json(alertas)
  } catch (err) {
    console.error('Error en /api/inventario/alertas:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// GET /api/inventario/bajos - Alternativa stock bajo (filtrado en JS; comparación col-col)
router.get('/bajos', verifyToken, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('inventario')
      .select(`
        id_producto,
        stock_actual,
        stock_minimo,
        productos:productos!inner(
          id_producto,
          nombre_producto,
          categorias:categorias!productos_id_categoria_fkey(nombre)
        )
      `)
      .order('stock_actual', { ascending: true })

    if (error) {
      console.error('Error consultando stock bajo:', error)
      return res.status(500).json({ message: 'Error al obtener productos con stock bajo' })
    }

    const productosBajos = (data ?? [])
      .filter(item => item.stock_actual <= item.stock_minimo)
      .map(item => ({
        id_producto: item.id_producto,
        nombre_producto: item.productos.nombre_producto,
        categoria: item.productos.categorias?.nombre || 'Sin categoría',
        stock_actual: item.stock_actual,
        stock_minimo: item.stock_minimo,
        diferencia: item.stock_actual - item.stock_minimo
      }))

    res.json(productosBajos)
  } catch (err) {
    console.error('Error en /api/inventario/bajos:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// GET /api/inventario/agotados - Productos con stock 0
router.get('/agotados', verifyToken, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('inventario')
      .select(`
        id_producto,
        stock_actual,
        stock_minimo,
        productos:productos!inner(
          id_producto,
          nombre_producto,
          categorias:categorias!productos_id_categoria_fkey(nombre)
        )
      `)
      .eq('stock_actual', 0)
      // Ordenar por el campo del join
      .order('nombre_producto', { ascending: true, referencedTable: 'productos' })

    if (error) {
      console.error('Error consultando productos agotados:', error)
      return res.status(500).json({ message: 'Error al obtener productos agotados' })
    }

    const productosAgotados = (data ?? []).map(item => ({
      id_producto: item.id_producto,
      nombre_producto: item.productos.nombre_producto,
      categoria: item.productos.categorias?.nombre || 'Sin categoría',
      stock_actual: item.stock_actual,
      stock_minimo: item.stock_minimo
    }))

    res.json(productosAgotados)
  } catch (err) {
    console.error('Error en /api/inventario/agotados:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

export default router
