import express from "express"
import { supabaseAdmin } from "../db/supabase.js"
import { verifyToken } from "../authMiddleware.js"

const router = express.Router()

// GET /api/tamanos - lista de tamaños activos ordenados
router.get("/", verifyToken, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("tamanos")
      .select("*")
      .eq("activo", true)
      .order("orden", { ascending: true })

    if (error) {
      console.error("Error consultando tamaños:", error)
      return res.status(500).json({ message: "Error al obtener tamaños" })
    }

    res.json(data ?? [])
  } catch (err) {
    console.error("Error en /api/tamanos:", err)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

export default router
