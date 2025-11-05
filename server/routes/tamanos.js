import express from "express";
import { supabase } from "../supabaseClient.js";
import { verifyToken } from "../authMiddleware.js";

const router = express.Router();

// GET /api/tamanos
router.get("/", verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tamanos")
      .select("*")
      .eq("activo", true)
      .order("orden");

    if (error) {
      console.error("Error consultando tamaños:", error);
      return res.status(500).json({ message: "Error al obtener tamaños" });
    }

    res.json(data);
  } catch (err) {
    console.error("Error en /api/tamanos:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;