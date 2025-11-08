import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Páginas (usa las que ya creaste; si falta alguna, déjala comentada o crea un stub)
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Pedido from "./pages/Pedido.jsx";
import Admin from "./pages/Admin.jsx";
 import AdminAuditoria from "./pages/AdminAuditoria.jsx";
 import AdminFacturas from "./pages/AdminFacturas.jsx";
 import Inventario from "./pages/Inventario.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Privadas */}
        <Route path="/pedido" element={<Pedido />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/auditoria" element={<AdminAuditoria />} />
        <Route path="/admin/facturas" element={<AdminFacturas />} />
        <Route path="/admin/inventario" element={<Inventario />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}