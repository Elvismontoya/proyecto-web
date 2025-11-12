import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Helpers
const money = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });
const getToken = () => localStorage.getItem("token") || "";
const toYMD = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split("T")[0];

export default function AdminAuditoria() {
  const navigate = useNavigate();

  // Fechas iniciales (últimos 7 días)
  const hoy = useMemo(() => new Date(), []);
  const sieteAtras = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; }, []);
  const [fechaDesde, setFechaDesde] = useState(toYMD(sieteAtras));
  const [fechaHasta, setFechaHasta] = useState(toYMD(hoy));

  // Data + estados
  const [ingresosDia, setIngresosDia] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [ingresosHoy, setIngresosHoy] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [loadingIngresos, setLoadingIngresos] = useState(true);
  const [loadingAuditoria, setLoadingAuditoria] = useState(true);

  const [msgIngresos, setMsgIngresos] = useState("Cargando ingresos...");
  const [msgAuditoria, setMsgAuditoria] = useState("Cargando auditoría...");

  // Totales
  const { totalIngresos, totalVentas, promedioVenta } = useMemo(() => {
    const tIng = ingresosDia.reduce((s, it) => s + (Number(it.ingresos_totales) || 0), 0);
    const tVen = ingresosDia.reduce((s, it) => s + (Number(it.total_ventas) || 0), 0);
    return { totalIngresos: tIng, totalVentas: tVen, promedioVenta: tVen > 0 ? tIng / tVen : 0 };
  }, [ingresosDia]);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("rol");
    if (!token) { navigate("/login", { replace: true }); return; }
    if (rol !== "admin") { navigate("/pedido", { replace: true }); return; }
  }, [navigate]);

  // Fetchers
  async function cargarIngresosPorDia(d = fechaDesde, h = fechaHasta) {
    try {
      setLoadingIngresos(true);
      setMsgIngresos("Cargando ingresos...");
      let url = `${import.meta.env.VITE_API_URL}/api/facturas/ingresos-por-dia`;
      const params = new URLSearchParams();
      if (d) params.append("fecha_desde", d);
      if (h) params.append("fecha_hasta", h);
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error cargando ingresos");
      }
      const data = await res.json();
      setIngresosDia(Array.isArray(data) ? data : []);
      setMsgIngresos(data?.length ? `Mostrando ${data.length} días` : "Sin datos de ingresos en el período seleccionado.");
    } catch (e) {
      console.error("❌ Error cargando ingresos:", e);
      setIngresosDia([]);
      setMsgIngresos("Error cargando ingresos. Verifica la conexión.");
    } finally {
      setLoadingIngresos(false);
    }
  }

  async function cargarAuditoria() {
    try {
      setLoadingAuditoria(true);
      setMsgAuditoria("Cargando auditoría...");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auditoria`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error cargando auditoría");
      }
      const data = await res.json();
      setAuditoria(Array.isArray(data) ? data : []);
      setMsgAuditoria(data?.length ? `Mostrando ${data.length} registros` : "Sin registros de auditoría.");
    } catch (e) {
      console.error("Error cargando auditoría:", e);
      setAuditoria([]);
      setMsgAuditoria("Error cargando auditoría.");
    } finally {
      setLoadingAuditoria(false);
    }
  }

  async function cargarIngresosHoy() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auditoria/ingresos-hoy`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIngresosHoy(data);
      }
    } catch (e) {
      console.error("Error cargando ingresos de hoy:", e);
    }
  }

  async function cargarTodosLosDatos() {
    setCargando(true);
    await Promise.all([cargarIngresosPorDia(), cargarAuditoria(), cargarIngresosHoy()]).catch(console.error);
    setCargando(false);
  }

  // Init
  useEffect(() => { cargarTodosLosDatos(); }, []);

  // Acciones UI
  function aplicarFiltros() { cargarIngresosPorDia(fechaDesde, fechaHasta); }
  function recargarDatos() { cargarTodosLosDatos(); }
  function logout() { localStorage.removeItem("token"); localStorage.removeItem("rol"); navigate("/login", { replace: true }); }

  // Loading full
  if (cargando) {
    return (
      <>
        <Navbar logout={logout} />
        <main className="container my-4">
          <Loader title="Cargando auditoría e ingresos..." />
        </main>
      </>
    );
  }

  // UI
  return (
    <>
      <Navbar logout={logout} />

      <main className="container my-4">
        {/* Hero */}
        <section className="hero mb-4 text-center fade-in">
          <div className="hero-content">
            <h1 className="display-6 fw-bold mb-2">Auditoría e Ingresos</h1>
            <p className="lead mb-4">Historial de ventas e ingresos por día.</p>

          </div>
        </section>

        {/* Stats */}
            <div className="mb-4 row g-3 justify-content-center stagger-children">
              {ingresosHoy && (
                <div className="col-12 col-md-3">
                  <StatCard
                    label="Ingresos hoy"
                    value={money(ingresosHoy.ingresos_totales)}
                    sub={`${ingresosHoy.total_ventas} ventas · Prom: ${money(ingresosHoy.promedio_venta)}`}
                  />
                </div>
              )}
              <div className="col-12 col-md-3">
                <StatCard label="Total ingresos" value={money(totalIngresos)} sub="Período seleccionado" />
              </div>
              <div className="col-12 col-md-3">
                <StatCard label="Ventas totales" value={totalVentas} sub="Facturas registradas" />
              </div>
              <div className="col-12 col-md-3">
                <StatCard label="Promedio por venta" value={money(promedioVenta)} sub="Valor promedio" />
              </div>
            </div>

        {/* Filtros (exactamente como al inicio) */}
        <div className="card card-soft mb-4">
          <div className="card-body">
            <h5 className="mb-3">Filtros de Fechas</h5>
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

        {/* Botón de recargar (versión original) */}
        <div className="d-flex justify-content-end mb-3">
          <button className="btn btn-sm btn-outline-brand" onClick={recargarDatos}>
            🔄 Actualizar datos
          </button>
        </div>

        {/* Ingresos por día */}
        <Section title="Ingresos por día" countLabel={`${ingresosDia.length} días`} className="mb-4 fade-in">
          <div className="table-responsive" style={{ maxHeight: 520 }}>
            <table className="table align-middle table-striped table-hover">
              <TheadSticky headers={["Fecha", "Total Ventas", "Ingresos Totales", "Promedio por Venta"]} />
              <tbody className="stagger-children">
                {loadingIngresos ? (
                  <SkeletonRows cols={4} rows={6} />
                ) : ingresosDia.length === 0 ? (
                  <EmptyRow cols={4} text="No hay datos de ingresos para el período seleccionado" />
                ) : (
                  ingresosDia.map((it, i) => (
                    <tr key={i}>
                      <td>
                        <strong>
                          {new Date(it.fecha).toLocaleDateString("es-CO", {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </strong>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-info fs-6">{it.total_ventas}</span>
                      </td>
                      <td className="text-end"><span className="price-badge">{money(it.ingresos_totales)}</span></td>
                      <td className="text-end"><span className="text-info">{money(it.promedio_venta)}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="small text-muted mt-2 mb-0">{msgIngresos}</p>
        </Section>

        {/* Historial de auditoría */}
        <Section title="Historial de auditoría" countLabel={`${auditoria.length} registros`} className="fade-in">
          <div className="table-responsive" style={{ maxHeight: 520 }}>
            <table className="table align-middle table-striped table-hover">
              <TheadSticky headers={["Fecha/Hora", "Empleado", "Acción", "Tabla", "Descripción"]} />
              <tbody className="stagger-children">
                {loadingAuditoria ? (
                  <SkeletonRows cols={5} rows={8} />
                ) : auditoria.length === 0 ? (
                  <EmptyRow cols={5} text="No hay registros de auditoría" />
                ) : (
                  auditoria.map((it) => (
                    <tr key={it.id_auditoria}>
                      <td className="small">{new Date(it.fecha_hora).toLocaleString("es-CO")}</td>
                      <td><span className="badge bg-light text-dark">{it.empleado || "Sistema"}</span></td>
                      <td>
                        <span className={`badge ${
                          it.accion === 'INSERT' ? 'bg-success' :
                          it.accion === 'UPDATE' ? 'bg-warning text-dark' :
                          it.accion === 'DELETE' ? 'bg-danger' : 'bg-secondary'
                        }`}>
                          {it.accion}
                        </span>
                      </td>
                      <td><code>{it.tabla_afectada || "-"}</code></td>
                      <td className="small">{it.descripcion || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="small text-muted mt-2 mb-0">{msgAuditoria}</p>
        </Section>
      </main>

      <Footer />
    </>
  );
}

/* =======================
   Componentes reutilizables
   ======================= */
function Navbar({ logout }) {
  return (
    <nav className="navbar navbar-expand-lg border-bottom sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-semibold" to="/">🍨 NixGelato</Link>
        <div className="d-flex flex-wrap gap-2">
          <Link className="btn btn-sm btn-outline-brand" to="/pedido">Caja / Pedido</Link>
          <Link className="btn btn-sm btn-outline-brand" to="/admin">Productos</Link>
          <Link className="btn btn-sm btn-brand" to="/admin/auditoria">Auditoría</Link>
          <Link className="btn btn-sm btn-outline-brand" to="/admin/facturas">Facturas</Link>
          <Link className="btn btn-sm btn-outline-brand" to="/admin/inventario">Inventario</Link>
          <button onClick={logout} className="btn btn-sm btn-outline-secondary">Cerrar sesión</button>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
      <footer className="py-4 border-top mt-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-4 text-center text-md-start mb-2 mb-md-0">
              <Link to="/" className="text-decoration-none fw-bold text-gradient">
                &copy; 2024 NixGelato
              </Link>
            </div>
            <div className="col-md-4 text-center mb-2 mb-md-0">
              <p className="mb-0 text-muted">Desarrollado por Elvis Montoya y Juan Hernandez</p>
            </div>
            <div className="col-md-4 text-center text-md-end">
              <div className="d-flex justify-content-center justify-content-md-end gap-4">
                <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="text-decoration-none text-muted hover-lift">
                  Instagram
                </a>
                <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" className="text-decoration-none text-muted hover-lift">
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
  );
}

function Loader({ title = "Cargando..." }) {
  return (
    <div className="text-center py-5 fade-in">
      <div className="spinner-border text-brand" role="status">
        <span className="visually-hidden">Cargando...</span>
      </div>
      <p className="mt-3">{title}</p>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card card-soft h-100">
      <div className="card-body text-center">
        <div className="text-muted">{label}</div>
        <div className="h4 fw-bold text-gradient mt-1">{value}</div>
        {sub && <small className="text-muted d-block">{sub}</small>}
      </div>
    </div>
  );
}

function Section({ title, countLabel, className = "", children }) {
  return (
    <section className={`card card-soft ${className}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">{title}</h5>
          {countLabel && <span className="badge bg-info">{countLabel}</span>}
        </div>
        {children}
      </div>
    </section>
  );
}

function TheadSticky({ headers = [] }) {
  return (
    <thead style={{ position: "sticky", top: 0, background: "var(--white)", zIndex: 1 }}>
      <tr>
        {headers.map((h, i) => (
          <th key={i} className={i === 0 ? "" : i === headers.length - 1 ? "text-end" : "text-center"}>{h}</th>
        ))}
      </tr>
    </thead>
  );
}

function SkeletonRows({ rows = 6, cols = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={`sk-${r}`}>
          <td colSpan={cols}>
            <div className="placeholder-wave"><span className="placeholder col-12" /></div>
          </td>
        </tr>
      ))}
    </>
  );
}

function EmptyRow({ cols = 1, text = "Sin datos" }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center text-muted py-5">
        <div className="mb-2">😶‍🌫️ {text}</div>
        <small>Prueba ajustando el rango de fechas o pulsa “Aplicar filtros”.</small>
      </td>
    </tr>
  );
}
