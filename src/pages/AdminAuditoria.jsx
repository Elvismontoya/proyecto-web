import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// helpers
const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

const getToken = () => localStorage.getItem("token") || "";

export default function AdminAuditoria() {
  const navigate = useNavigate();

  // filtros (últimos 7 días por defecto)
  const hoy = useMemo(() => new Date(), []);
  const sieteDias = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const [fechaDesde, setFechaDesde] = useState(
    sieteDias.toISOString().split("T")[0]
  );
  const [fechaHasta, setFechaHasta] = useState(
    hoy.toISOString().split("T")[0]
  );

  // data + estados
  const [ingresosDia, setIngresosDia] = useState([]);
  const [auditoria, setAuditoria] = useState([]);

  const [msgIngresos, setMsgIngresos] = useState("Cargando ingresos...");
  const [msgAuditoria, setMsgAuditoria] = useState("Cargando auditoría...");

  // totales
  const { totalIngresos, totalVentas, promedioVenta } = useMemo(() => {
    const tIng = ingresosDia.reduce((s, it) => s + (it.ingresos_totales || 0), 0);
    const tVen = ingresosDia.reduce((s, it) => s + (it.total_ventas || 0), 0);
    const prom = tVen > 0 ? tIng / tVen : 0;
    return { totalIngresos: tIng, totalVentas: tVen, promedioVenta: prom };
  }, [ingresosDia]);

  // auth check
  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("rol");
    if (!token) { navigate("/login", { replace: true }); return; }
    if (rol !== "admin") { navigate("/pedido", { replace: true }); return; }
  }, [navigate]);

  // cargar ingresos
  async function cargarIngresosPorDia(d = fechaDesde, h = fechaHasta) {
    try {
      setMsgIngresos("Cargando ingresos...");
      let url = "/api/facturas/ingresos-por-dia";
      if (d && h) url += `?fecha_desde=${d}&fecha_hasta=${h}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Error cargando ingresos");

      const data = await res.json();
      setIngresosDia(Array.isArray(data) ? data : []);
      setMsgIngresos(
        Array.isArray(data) && data.length
          ? `Mostrando ${data.length} días`
          : "Sin datos de ingresos."
      );
    } catch (e) {
      console.error(e);
      setIngresosDia([]);
      setMsgIngresos("Error cargando ingresos.");
    }
  }

  // cargar auditoría
  async function cargarAuditoria() {
    try {
      setMsgAuditoria("Cargando auditoría...");
      const res = await fetch("/api/auditoria", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Error cargando auditoría");
      const data = await res.json();
      setAuditoria(Array.isArray(data) ? data : []);
      setMsgAuditoria(
        Array.isArray(data) && data.length
          ? `Mostrando ${data.length} registros`
          : "Sin registros de auditoría."
      );
    } catch (e) {
      console.error(e);
      setAuditoria([]);
      setMsgAuditoria("Error cargando auditoría.");
    }
  }

  // init
  useEffect(() => {
    cargarIngresosPorDia();
    cargarAuditoria();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aplicarFiltros() {
    cargarIngresosPorDia(fechaDesde, fechaHasta);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    navigate("/login", { replace: true });
  }

  return (
    <>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg border-bottom sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-semibold" to="/">🍨 GelatoPro</Link>
          <div className="d-flex flex-wrap gap-2">
            <Link className="btn btn-sm btn-outline-brand" to="/pedido">Caja / Pedido</Link>
            <Link className="btn btn-sm btn-outline-brand" to="/admin">Productos</Link>
            <Link className="btn btn-sm btn-brand" to="/admin/auditoria">Auditoría</Link>
            <Link className="btn btn-sm btn-outline-brand" to="/admin/facturas">Facturas</Link>
            <button onClick={logout} className="btn btn-sm btn-outline-secondary">Cerrar sesión</button>
          </div>
        </div>
      </nav>

      <main className="container my-4">
        {/* Encabezado */}
        <section className="hero mb-4 text-center">
          <h1 className="display-6 fw-bold mb-2">Auditoría e Ingresos</h1>
          <p className="lead mb-0">Historial de ventas e ingresos por día.</p>
        </section>

        {/* Filtros */}
        <div className="card card-soft mb-4">
          <div className="card-body">
            <h5 className="mb-3">Filtros</h5>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Fecha desde</label>
                <input
                  type="date"
                  className="form-control"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Fecha hasta</label>
                <input
                  type="date"
                  className="form-control"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button className="btn btn-brand w-100" onClick={aplicarFiltros}>
                  Aplicar filtros
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de ingresos */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="card card-soft bg-success text-white">
              <div className="card-body text-center">
                <h5>Total Ingresos</h5>
                <h2 id="totalIngresos">{money(totalIngresos)}</h2>
                <small>Período seleccionado</small>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card card-soft bg-primary text-white">
              <div className="card-body text-center">
                <h5>Ventas Totales</h5>
                <h2 id="totalVentas">{totalVentas}</h2>
                <small>Facturas registradas</small>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card card-soft bg-info text-white">
              <div className="card-body text-center">
                <h5>Promedio por Venta</h5>
                <h2 id="promedioVenta">{money(promedioVenta)}</h2>
                <small>Valor promedio</small>
              </div>
            </div>
          </div>
        </div>

        {/* Ingresos por día */}
        <div className="card card-soft mb-4">
          <div className="card-body">
            <h5 className="mb-3">Ingresos por Día</h5>
            <div className="table-responsive">
              <table className="table align-middle" id="tablaIngresosDia">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="text-center">Ventas</th>
                    <th className="text-end">Ingresos</th>
                    <th className="text-end">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {ingresosDia.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted">
                        No hay datos de ingresos
                      </td>
                    </tr>
                  ) : (
                    ingresosDia.map((it, i) => (
                      <tr key={i}>
                        <td>{new Date(it.fecha).toLocaleDateString("es-CO")}</td>
                        <td className="text-center">{it.total_ventas}</td>
                        <td className="text-end">{money(it.ingresos_totales)}</td>
                        <td className="text-end">{money(it.promedio_venta)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="small text-muted mt-2 mb-0" id="msgIngresos">
              {msgIngresos}
            </p>
          </div>
        </div>

        {/* Historial de auditoría */}
        <div className="card card-soft">
          <div className="card-body">
            <h5 className="mb-3">Historial de Auditoría</h5>
            <div className="table-responsive">
              <table className="table align-middle" id="tablaAuditoria">
                <thead>
                  <tr>
                    <th>Fecha/Hora</th>
                    <th>Empleado</th>
                    <th>Acción</th>
                    <th>Tabla</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {auditoria.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted">
                        No hay registros de auditoría
                      </td>
                    </tr>
                  ) : (
                    auditoria.map((it) => (
                      <tr key={it.id}>
                        <td>{new Date(it.fecha_hora).toLocaleString("es-CO")}</td>
                        <td>{it.empleado || "Sistema"}</td>
                        <td>{it.accion}</td>
                        <td>{it.tabla_afectada || "-"}</td>
                        <td>{it.descripcion || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="small text-muted mt-2 mb-0" id="msgAuditoria">
              {msgAuditoria}
            </p>
          </div>
        </div>
      </main>

      <footer className="py-4 border-top">
        <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <Link to="/">&copy; GelatoPro</Link>
          <p className="mb-0">Desarrollado por Elvis Montoya y Juan Hernandez</p>
          <div className="d-flex gap-4">
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer">Facebook</a>
          </div>
        </div>
      </footer>
    </>
  );
}
