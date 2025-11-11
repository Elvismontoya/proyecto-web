import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="nav">
      <div className="container">
        <Link to="/" className="brand">🍨 NixGelato</Link>
        <div className="links">
          <Link to="/admin">Admin</Link>
          <Link to="/admin/auditoria">Auditoría</Link>
          <Link to="/admin/facturas">Facturas</Link>
          <Link to="/login">Login</Link>
        </div>
      </div>
    </nav>
  );
}