// server/routes/categorias.js
import express from 'express'
import { supabaseAdmin } from '../db/supabase.js'
import { verifyToken, requireAdmin } from '../authMiddleware.js'

const router = express.Router()

// GET /api/categorias - Obtener todas las categorías activas
router.get('/', verifyToken, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categorias')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.error('Error consultando categorías:', error)
      return res.status(500).json({ message: 'Error al obtener categorías' })
    }

    res.json(data)
  } catch (err) {
    console.error('Error en /api/categorias:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// POST /api/categorias - Crear nueva categoría
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { nombre, descripcion } = req.body

  if (!nombre?.trim()) {
    return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('categorias')
      .insert([{
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        activo: true
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creando categoría:', error)
      return res.status(500).json({ message: 'Error al crear categoría' })
    }

    res.status(201).json({ message: 'Categoría creada correctamente', categoria: data })
  } catch (err) {
    console.error('Error en POST /api/categorias:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// PUT /api/categorias/:id - Actualizar categoría
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { nombre, descripcion } = req.body

  if (!nombre?.trim()) {
    return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('categorias')
      .update({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id_categoria', id)
      .select()
      .single()

    if (error) {
      console.error('Error actualizando categoría:', error)
      return res.status(500).json({ message: 'Error al actualizar categoría' })
    }

    res.json({ message: 'Categoría actualizada correctamente', categoria: data })
  } catch (err) {
    console.error('Error en PUT /api/categorias:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// DELETE /api/categorias/:id - Desactivar categoría (soft delete)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params

  try {
    // 1) Verificar si la categoría existe
    const { data: categoria, error: errorCategoria } = await supabaseAdmin
      .from('categorias')
      .select('id_categoria, nombre')
      .eq('id_categoria', id)
      .single()

    if (errorCategoria || !categoria) {
      return res.status(404).json({ message: 'Categoría no encontrada' })
    }

    // 2) Contar productos activos en esta categoría
    const { count: productosActivosCount, error: countErr } = await supabaseAdmin
      .from('productos')
      .select('id_producto', { count: 'exact', head: true })
      .eq('id_categoria', id)
      .eq('activo', true)

    if (countErr) {
      console.error('Error contando productos:', countErr)
    }

    // 3) Quitar la categoría a los productos (dejarlos sin categoría)
    if ((productosActivosCount ?? 0) > 0) {
      const { error: errorUpdate } = await supabaseAdmin
        .from('productos')
        .update({ id_categoria: null })
        .eq('id_categoria', id)
        .eq('activo', true)

      if (errorUpdate) {
        console.error('Error actualizando productos:', errorUpdate)
      }
    }

    // 4) Soft delete de la categoría
    const { error } = await supabaseAdmin
      .from('categorias')
      .update({
        activo: false,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id_categoria', id)

    if (error) {
      console.error('Error desactivando categoría:', error)
      return res.status(500).json({ message: 'Error al desactivar categoría' })
    }

    // 5) Auditoría (no interrumpe respuesta si falla)
    try {
      await supabaseAdmin
        .from('auditoria')
        .insert([{
          id_empleado: req.user?.id_empleado ?? null,
          accion: 'DELETE',
          tabla_afectada: 'categorias',
          id_registro_afectado: id,
          descripcion: `Categoría desactivada: ${categoria.nombre}. ${productosActivosCount || 0} producto(s) quedaron sin categoría.`
        }])
    } catch (auditError) {
      console.error('Error registrando auditoría:', auditError)
    }

    res.json({
      message: `Categoría desactivada correctamente. ${productosActivosCount || 0} producto(s) quedaron sin categoría.`,
      categoria: categoria.nombre
    })
  } catch (err) {
    console.error('Error en DELETE /api/categorias:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

export default router
