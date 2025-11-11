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
  const [ingresosHoy, setIngresosHoy] = useState(null);
  const [cargando, setCargando] = useState(true);

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

  // cargar ingresos por día
  async function cargarIngresosPorDia(d = fechaDesde, h = fechaHasta) {
    try {
      setMsgIngresos("Cargando ingresos...");
      let url = `${import.meta.env.VITE_API_URL}/api/facturas/ingresos-por-dia`;
      const params = new URLSearchParams();
      if (d) params.append("fecha_desde", d);
      if (h) params.append("fecha_hasta", h);
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      console.log("📊 Cargando ingresos desde:", url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Error cargando ingresos");
      }

      const data = await res.json();
      console.log("✅ Ingresos cargados:", data);
      
      setIngresosDia(Array.isArray(data) ? data : []);
      setMsgIngresos(
        Array.isArray(data) && data.length
          ? `Mostrando ${data.length} días`
          : "Sin datos de ingresos en el período seleccionado."
      );
    } catch (e) {
      console.error("❌ Error cargando ingresos:", e);
      setIngresosDia([]);
      setMsgIngresos("Error cargando ingresos. Verifica la conexión.");
    }
  }

  // cargar auditoría
  async function cargarAuditoria() {
    try {
      setMsgAuditoria("Cargando auditoría...");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auditoria`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Error cargando auditoría");
      }
      
      const data = await res.json();
      setAuditoria(Array.isArray(data) ? data : []);
      setMsgAuditoria(
        Array.isArray(data) && data.length
          ? `Mostrando ${data.length} registros`
          : "Sin registros de auditoría."
      );
    } catch (e) {
      console.error("Error cargando auditoría:", e);
      setAuditoria([]);
      setMsgAuditoria("Error cargando auditoría.");
    }
  }

  // cargar ingresos de hoy
  async function cargarIngresosHoy() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auditoria/ingresos-hoy`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setIngresosHoy(data);
        console.log("💰 Ingresos hoy:", data);
      } else {
        console.warn("No se pudieron cargar los ingresos de hoy");
      }
    } catch (e) {
      console.error("Error cargando ingresos de hoy:", e);
    }
  }

  // cargar todos los datos
  async function cargarTodosLosDatos() {
    setCargando(true);
    try {
      await Promise.all([
        cargarIngresosPorDia(),
        cargarAuditoria(),
        cargarIngresosHoy()
      ]);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setCargando(false);
    }
  }

  // init
  useEffect(() => {
    cargarTodosLosDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aplicarFiltros() {
    cargarIngresosPorDia(fechaDesde, fechaHasta);
  }

  function recargarDatos() {
    cargarTodosLosDatos();
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    navigate("/login", { replace: true });
  }

  if (cargando) {
    return (
      <>
        <Navbar logout={logout} />
        <main className="container my-4">
          <div className="text-center py-5">
            <div className="spinner-border text-brand" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-3">Cargando auditoría e ingresos...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar logout={logout} />
      
      <main className="container my-4">
        {/* Encabezado */}
        <section className="hero mb-4 text-center">
          <h1 className="display-6 fw-bold mb-2">Auditoría e Ingresos</h1>
          <p className="lead mb-0">Historial de ventas e ingresos por día.</p>
        </section>

        {/* Botón de recargar */}
        <div className="d-flex justify-content-end mb-3">
          <button className="btn btn-sm btn-outline-brand" onClick={recargarDatos}>
            🔄 Actualizar datos
          </button>
        </div>

        {/* Filtros */}
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

        {/* Resumen de ingresos - INCLUYENDO HOY */}
        <div className="row g-4 mb-4">
          {/* Ingresos del día de hoy */}
          {ingresosHoy && (
            <div className="col-md-3">
              <div className="card card-soft bg-warning text-dark">
                <div className="card-body text-center">
                  <h5>Ingresos Hoy</h5>
                  <h2>{money(ingresosHoy.ingresos_totales)}</h2>
                  <small>{ingresosHoy.total_ventas} ventas</small>
                  <br />
                  <small>Promedio: {money(ingresosHoy.promedio_venta)}</small>
                </div>
              </div>
            </div>
          )}
          
          <div className="col-md-3">
            <div className="card card-soft bg-success text-white">
              <div className="card-body text-center">
                <h5>Total Ingresos</h5>
                <h2>{money(totalIngresos)}</h2>
                <small>Período seleccionado</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card card-soft bg-primary text-white">
              <div className="card-body text-center">
                <h5>Ventas Totales</h5>
                <h2>{totalVentas}</h2>
                <small>Facturas registradas</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card card-soft bg-info text-white">
              <div className="card-body text-center">
                <h5>Promedio por Venta</h5>
                <h2>{money(promedioVenta)}</h2>
                <small>Valor promedio</small>
              </div>
            </div>
          </div>
        </div>

        {/* Ingresos por día - TABLA PRINCIPAL */}
        <div className="card card-soft mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Ingresos por Día</h5>
              <span className="badge bg-primary">
                {ingresosDia.length} días mostrados
              </span>
            </div>
            
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="text-center">Total Ventas</th>
                    <th className="text-end">Ingresos Totales</th>
                    <th className="text-end">Promedio por Venta</th>
                  </tr>
                </thead>
                <tbody>
                  {ingresosDia.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">
                        No hay datos de ingresos para el período seleccionado
                      </td>
                    </tr>
                  ) : (
                    ingresosDia.map((it, i) => (
                      <tr key={i}>
                        <td>
                          <strong>{new Date(it.fecha).toLocaleDateString("es-CO", { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</strong>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-primary fs-6">
                            {it.total_ventas}
                          </span>
                        </td>
                        <td className="text-end">
                          <span className="fw-bold text-success fs-5">
                            {money(it.ingresos_totales)}
                          </span>
                        </td>
                        <td className="text-end">
                          <span className="text-info">
                            {money(it.promedio_venta)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="small text-muted mt-2 mb-0">
              {msgIngresos}
            </p>
          </div>
        </div>

        {/* Historial de auditoría */}
        <div className="card card-soft">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Historial de Auditoría</h5>
              <span className="badge bg-secondary">
                {auditoria.length} registros
              </span>
            </div>
            
            <div className="table-responsive">
              <table className="table align-middle">
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
                      <td colSpan={5} className="text-center text-muted py-4">
                        No hay registros de auditoría
                      </td>
                    </tr>
                  ) : (
                    auditoria.map((it) => (
                      <tr key={it.id_auditoria}>
                        <td className="small">
                          {new Date(it.fecha_hora).toLocaleString("es-CO")}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark">
                            {it.empleado || "Sistema"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            it.accion === 'INSERT' ? 'bg-success' : 
                            it.accion === 'UPDATE' ? 'bg-warning text-dark' : 
                            it.accion === 'DELETE' ? 'bg-danger' : 'bg-secondary'
                          }`}>
                            {it.accion}
                          </span>
                        </td>
                        <td>
                          <code>{it.tabla_afectada || "-"}</code>
                        </td>
                        <td className="small">
                          {it.descripcion || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="small text-muted mt-2 mb-0">
              {msgAuditoria}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

// Componentes reutilizables
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
    <footer className="py-4 border-top">
      <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
        <Link to="/">&copy; NixGelato</Link>
        <p className="mb-0">Desarrollado por Elvis Montoya y Juan Hernandez</p>
        <div className="d-flex gap-4">
          <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://www.facebook.com/" target="_blank" rel="noreferrer">Facebook</a>
        </div>
      </div>
    </footer>
  );
}