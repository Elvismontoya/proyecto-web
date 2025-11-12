import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

const getToken = () => localStorage.getItem("token") || "";

export default function AdminFacturas() {
  const navigate = useNavigate();

  // Rango por defecto: últimos 30 días
  const hoy = useMemo(() => new Date(), []);
  const treintaDias = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);
  const [fechaDesde, setFechaDesde] = useState(treintaDias.toISOString().split("T")[0]);
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().split("T")[0]);

  const [empleados, setEmpleados] = useState([]);
  const [idEmpleado, setIdEmpleado] = useState("");

  const [facturas, setFacturas] = useState([]);
  const [msgFacturas, setMsgFacturas] = useState("Cargando facturas...");

  // Loading simple
  const [cargando, setCargando] = useState(true);

  // Modal detalle
  const [showModal, setShowModal] = useState(false);
  const [detalle, setDetalle] = useState(null); // { factura, productos }

  // ===== Auth =====
  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("rol");
    if (!token) { navigate("/login", { replace: true }); return; }
    if (rol !== "admin") { navigate("/pedido", { replace: true }); return; }
  }, [navigate]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    navigate("/login", { replace: true });
  }

  // ===== Fetchers =====
  async function cargarEmpleados() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/empleados`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmpleados(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error cargando empleados:", e);
    }
  }

  async function cargarFacturas(fIni = fechaDesde, fFin = fechaHasta, emp = idEmpleado) {
    try {
      setMsgFacturas("Cargando facturas...");
      setCargando(true);

      let url = `${import.meta.env.VITE_API_URL}/api/facturas`;
      const params = new URLSearchParams();
      if (fIni) params.append("fecha_desde", fIni);
      if (fFin) params.append("fecha_hasta", fFin);
      if (emp) params.append("id_empleado", emp);
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Error cargando facturas");
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setFacturas(lista);
      setMsgFacturas(
        lista.length ? `Mostrando ${lista.length} facturas` : "Sin facturas registradas."
      );
    } catch (e) {
      console.error("Error cargando facturas:", e);
      setFacturas([]);
      setMsgFacturas("Error cargando facturas.");
    } finally {
      setCargando(false);
    }
  }

  async function verDetalleFactura(idFactura) {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/facturas/${idFactura}/detalle`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Error cargando detalle");
      const data = await res.json();
      setDetalle(data); // { factura, productos }
      setShowModal(true);
    } catch (e) {
      console.error("Error cargando detalle:", e);
      alert("Error al cargar el detalle de la factura");
    }
  }

  // Init
  useEffect(() => {
    cargarEmpleados();
    cargarFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Acciones UI =====
  function aplicarFiltros() {
    cargarFacturas(fechaDesde, fechaHasta, idEmpleado);
  }

  function exportCSV() {
    if (!facturas.length) return;
    const rows = facturas.map((f) => ({
      id_factura: f.id_factura,
      fecha_hora: f.fecha_hora,
      empleado: f.empleado_nombres ?? "",
      cliente: f.observaciones ?? "",
      subtotal: f.total_bruto ?? 0,
      descuento: f.descuento_total ?? 0,
      total: f.total_neto ?? 0,
    }));

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => `"${String(r[h] ?? "").replaceAll('"', '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facturas_${fechaDesde}_a_${fechaHasta}${idEmpleado ? `_emp-${idEmpleado}` : ""}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ===== KPIs =====
  const kpis = useMemo(() => {
    const totalFacturas = facturas.length;
    const subtotalBruto = facturas.reduce((s, f) => s + Number(f.total_bruto || 0), 0);
    const descuentos = facturas.reduce((s, f) => s + Number(f.descuento_total || 0), 0);
    const totalNeto = facturas.reduce((s, f) => s + Number(f.total_neto || 0), 0);
    const promedioFactura = totalFacturas ? totalNeto / totalFacturas : 0;
    return { totalFacturas, subtotalBruto, descuentos, totalNeto, promedioFactura };
  }, [facturas]);

  return (
    <>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg border-bottom sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-semibold" to="/">🍨 NixGelato</Link>
          <div className="d-flex flex-wrap gap-2">
            <Link className="btn btn-sm btn-outline-brand" to="/pedido">Caja / Pedido</Link>
            <Link className="btn btn-sm btn-outline-brand" to="/admin">Productos</Link>
            <Link className="btn btn-sm btn-outline-brand" to="/admin/auditoria">Auditoría</Link>
            <Link className="btn btn-sm btn-brand" to="/admin/facturas">Facturas</Link>
            <Link className="btn btn-sm btn-outline-brand" to="/admin/inventario">Inventario</Link>
            <button onClick={logout} className="btn btn-sm btn-outline-secondary">Cerrar sesión</button>
          </div>
        </div>
      </nav>

      <main className="container my-4">
        {/* Encabezado */}
        <section className="hero mb-4 text-center">
          <div className="hero-content">
            <h1 className="display-6 fw-bold mb-2">Gestión de Facturas</h1>
            <p className="lead mb-0">Consulta y gestiona todas las facturas del sistema.</p>
          </div>
        </section>

        {/* KPIs / Resumen */}
        <section className="mb-4 fade-in">
          <div className="row g-3">
            <div className="col-12 col-md-3">
              <div className="card card-soft h-100">
                <div className="card-body text-center">
                  <div className="text-muted">Total facturas</div>
                  <div className="h4 fw-bold text-gradient mt-1">{kpis.totalFacturas}</div>
                  <small className="text-muted">Rango seleccionado</small>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-3">
              <div className="card card-soft h-100">
                <div className="card-body text-center">
                  <div className="text-muted">Ingresos netos</div>
                  <div className="h4 fw-bold text-gradient mt-1">{money(kpis.totalNeto)}</div>
                  <small className="text-muted">Total cobrado</small>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-3">
              <div className="card card-soft h-100">
                <div className="card-body text-center">
                  <div className="text-muted">Subtotal bruto</div>
                  <div className="h4 fw-bold text-gradient mt-1">{money(kpis.subtotalBruto)}</div>
                  <small className="text-muted">Antes de descuentos</small>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-3">
              <div className="card card-soft h-100">
                <div className="card-body text-center">
                  <div className="text-muted">Promedio por factura</div>
                  <div className="h4 fw-bold text-gradient mt-1">{money(kpis.promedioFactura)}</div>
                  <small className="text-muted">Ticket medio</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filtros (idénticos a tu versión) */}
        <div className="card card-soft mb-4">
          <div className="card-body">
            <h5 className="mb-3">Filtros</h5>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Fecha desde</label>
                <input
                  type="date"
                  className="form-control"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Fecha hasta</label>
                <input
                  type="date"
                  className="form-control"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Empleado</label>
                <select
                  className="form-select"
                  value={idEmpleado}
                  onChange={(e) => setIdEmpleado(e.target.value)}
                >
                  <option value="">Todos los empleados</option>
                  {empleados.map((emp) => (
                    <option key={emp.id_empleado} value={emp.id_empleado}>
                      {emp.nombres} {emp.apellidos}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <button className="btn btn-brand w-100" onClick={aplicarFiltros}>
                  Aplicar filtros
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de facturas */}
        <section className="card card-soft fade-in">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0">Facturas registradas</h5>
                <span className="badge bg-info">{facturas.length}</span>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-brand" onClick={exportCSV}>⬇️ Exportar CSV</button>
              </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: 560 }}>
              <table className="table table-striped table-hover align-middle">
                <thead style={{ position: "sticky", top: 0, background: "var(--white)", zIndex: 1 }}>
                  <tr>
                    <th>ID</th>
                    <th>Fecha/Hora</th>
                    <th>Empleado</th>
                    <th>Cliente</th>
                    <th className="text-end">Subtotal</th>
                    <th className="text-end">Descuento</th>
                    <th className="text-end">Total</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    Array.from({ length: 7 }).map((_, i) => (
                      <tr key={`sk-${i}`}>
                        <td colSpan={8}>
                          <div className="placeholder-wave"><span className="placeholder col-12" /></div>
                        </td>
                      </tr>
                    ))
                  ) : facturas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-5">
                        😶‍🌫️ No hay facturas registradas en el rango seleccionado
                      </td>
                    </tr>
                  ) : (
                    facturas.map((f) => (
                      <tr key={f.id_factura}>
                        <td>#{f.id_factura}</td>
                        <td>{new Date(f.fecha_hora).toLocaleString("es-CO")}</td>
                        <td><span className="badge bg-light text-dark">{f.empleado_nombres || "N/A"}</span></td>
                        <td>{f.observaciones || "Cliente no registrado"}</td>
                        <td className="text-end">{money(f.total_bruto)}</td>
                        <td className="text-end text-danger">{money(f.descuento_total)}</td>
                        <td className="text-end fw-semibold text-success">{money(f.total_neto)}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-brand"
                            onClick={() => verDetalleFactura(f.id_factura)}
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="small text-muted mt-2 mb-0" id="msgFacturas">
              {msgFacturas}
            </p>
          </div>
        </section>
      </main>

      {/* Modal Detalle */}
      {showModal && detalle && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
              <div className="modal-content shadow-lg border-0">
                <div className="modal-header" style={{ background: "linear-gradient(135deg, var(--sky), var(--aqua))", color: "#000" }}>
                  <h5 className="modal-title">
                    Factura #{detalle.factura?.id_factura}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setShowModal(false)}
                  />
                </div>
                <div className="modal-body">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <strong>Fecha:</strong>{" "}
                      {new Date(detalle.factura?.fecha_hora).toLocaleString("es-CO")} <br />
                      <strong>Empleado:</strong>{" "}
                      {detalle.factura?.empleado_nombres || "N/A"}
                    </div>
                    <div className="col-md-6">
                      <strong>Cliente:</strong>{" "}
                      {detalle.factura?.observaciones || "Cliente no registrado"} <br />
                      <strong>Total:</strong>{" "}
                      <span className="fw-semibold text-success">
                        {money(detalle.factura?.total_neto)}
                      </span>
                    </div>
                  </div>

                  <h6 className="mb-2">Productos</h6>
                  <div className="table-responsive">
                    <table className="table table-sm table-hover" id="tablaDetalleProductos">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th className="text-center">Cantidad</th>
                          <th className="text-end">Precio Unitario</th>
                          <th className="text-end">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalle.productos?.length ? (
                          detalle.productos.map((p, i) => (
                            <tr key={i}>
                              <td>{p.nombre_producto || `Producto ${p.id_producto}`}</td>
                              <td className="text-center">{p.cantidad}</td>
                              <td className="text-end">{money(p.precio_unitario_venta)}</td>
                              <td className="text-end fw-semibold">{money(p.subtotal_linea)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="text-center text-muted py-4">
                              Sin productos
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* backdrop */}
          <div className="modal-backdrop fade show" onClick={() => setShowModal(false)} />
        </>
      )}

      {/* FOOTER */}
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
    </>
  );
}
