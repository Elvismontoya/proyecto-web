import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar border-bottom sticky-top">
      <div className="container d-flex justify-content-between align-items-center">
        <Link to="/" className="navbar-brand fw-semibold">🍨 NixGelato</Link>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <Link to="/admin" className="btn-outline-brand btn-xs">Admin</Link>
          <Link to="/admin/auditoria" className="btn-outline-brand btn-xs">Auditoría</Link>
          <Link to="/admin/facturas" className="btn-outline-brand btn-xs">Facturas</Link>
          <Link to="/login" className="btn-outline-brand btn-xs">Login</Link>
        </div>
      </div>
    </nav>
  );
}
