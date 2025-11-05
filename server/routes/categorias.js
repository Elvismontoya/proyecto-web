import express from 'express';
import { supabase } from '../supabaseClient.js';
import { verifyToken, requireAdmin } from '../authMiddleware.js';

const router = express.Router();

// GET /api/categorias - Obtener todas las categorías activas
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) {
      console.error('Error consultando categorías:', error);
      return res.status(500).json({ message: 'Error al obtener categorías' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error en /api/categorias:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/categorias - Crear nueva categoría
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { nombre, descripcion } = req.body;

  if (!nombre?.trim()) {
    return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
  }

  try {
    const { data, error } = await supabase
      .from('categorias')
      .insert([
        {
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || '',
          activo: true
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creando categoría:', error);
      return res.status(500).json({ message: 'Error al crear categoría' });
    }

    res.status(201).json({ 
      message: 'Categoría creada correctamente', 
      categoria: data 
    });
  } catch (err) {
    console.error('Error en POST /api/categorias:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/categorias/:id - Actualizar categoría
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;

  if (!nombre?.trim()) {
    return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
  }

  try {
    const { data, error } = await supabase
      .from('categorias')
      .update({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id_categoria', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando categoría:', error);
      return res.status(500).json({ message: 'Error al actualizar categoría' });
    }

    res.json({ 
      message: 'Categoría actualizada correctamente', 
      categoria: data 
    });
  } catch (err) {
    console.error('Error en PUT /api/categorias:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// DELETE /api/categorias/:id - Desactivar categoría (soft delete)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si la categoría existe
    const { data: categoria, error: errorCategoria } = await supabase
      .from('categorias')
      .select('id_categoria, nombre')
      .eq('id_categoria', id)
      .single();

    if (errorCategoria || !categoria) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar si hay productos en esta categoría
    const { data: productos, error: errorProductos } = await supabase
      .from('productos')
      .select('id_producto, nombre_producto')
      .eq('id_categoria', id)
      .eq('activo', true)
      .limit(1);

    if (errorProductos) {
      console.error('Error verificando productos:', errorProductos);
    }

    let mensajeAdicional = '';
    
    // Si hay productos en esta categoría, quitarlos de la categoría
    if (productos && productos.length > 0) {
      const { error: errorUpdate } = await supabase
        .from('productos')
        .update({ id_categoria: null })
        .eq('id_categoria', id);

      if (errorUpdate) {
        console.error('Error actualizando productos:', errorUpdate);
      } else {
        mensajeAdicional = ` ${productos.length} producto(s) quedaron sin categoría.`;
      }
    }

    // Hacer soft delete de la categoría
    const { error } = await supabase
      .from('categorias')
      .update({ 
        activo: false,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id_categoria', id);

    if (error) {
      console.error('Error desactivando categoría:', error);
      return res.status(500).json({ message: 'Error al desactivar categoría' });
    }

    // Registrar en auditoría
    try {
      await supabase
        .from('auditoria')
        .insert([
          {
            id_empleado: req.user.id_empleado,
            accion: 'DELETE',
            tabla_afectada: 'categorias',
            id_registro_afectado: id,
            descripcion: `Categoría desactivada: ${categoria.nombre}${mensajeAdicional}`
          }
        ]);
    } catch (auditError) {
      console.error('Error registrando auditoría:', auditError);
    }

    res.json({ 
      message: `Categoría desactivada correctamente.${mensajeAdicional}`,
      categoria: categoria.nombre
    });
  } catch (err) {
    console.error('Error en DELETE /api/categorias:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;