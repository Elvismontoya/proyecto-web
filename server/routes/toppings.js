// server/routes/toppings.js
import express from "express"
import { supabaseAdmin } from "../db/supabase.js"
import { verifyToken } from "../authMiddleware.js"

const router = express.Router()

// GET /api/toppings - listar toppings activos ordenados por nombre
router.get("/", verifyToken, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("toppings")
      .select("*")
      .eq("activo", true)
      .order("nombre", { ascending: true })

    if (error) {
      console.error("Error consultando toppings:", error)
      return res.status(500).json({ message: "Error al obtener toppings" })
    }

    res.json(data ?? [])
  } catch (err) {
    console.error("Error en /api/toppings:", err)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

export default router
