import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Inventario from './pages/Inventario.jsx';
import Admin from './pages/Admin.jsx';
import AdminAuditoria from './pages/AdminAuditoria.jsx';
import AdminFacturas from './pages/AdminFacturas.jsx';
import Pedido from './pages/Pedido.jsx';

function LayoutWithNavbar() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login';
  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/pedido" element={<ProtectedRoute><Pedido /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}><Admin /></ProtectedRoute>
        } />
        <Route path="/admin/auditoria" element={
          <ProtectedRoute roles={['admin']}><AdminAuditoria /></ProtectedRoute>
        } />
        <Route path="/admin/facturas" element={
          <ProtectedRoute roles={['admin']}><AdminFacturas /></ProtectedRoute>
        } />
        <Route path="/admin/inventario" element={
          <ProtectedRoute roles={['admin']}><Inventario /></ProtectedRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<div className="container py-5">Página no encontrada</div>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LayoutWithNavbar />
    </BrowserRouter>
  );
}
