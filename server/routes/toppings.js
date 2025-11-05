import express from "express";
import { supabase } from "../supabaseClient.js";
import { verifyToken } from "../authMiddleware.js";

const router = express.Router();

// GET /api/toppings
router.get("/", verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("toppings")
      .select("*")
      .eq("activo", true)
      .order("nombre");

    if (error) {
      console.error("Error consultando toppings:", error);
      return res.status(500).json({ message: "Error al obtener toppings" });
    }

    res.json(data);
  } catch (err) {
    console.error("Error en /api/toppings:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;