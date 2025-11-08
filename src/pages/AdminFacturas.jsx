import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet } from "../lib/api"; // 👈 usa el cliente central

const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

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

  // Modal detalle
  const [showModal, setShowModal] = useState(false);
  const [detalle, setDetalle] = useState(null); // { factura, productos }

  // auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = (localStorage.getItem("rol") || "").toLowerCase();
    if (!token) { navigate("/login", { replace: true }); return; }
    if (rol !== "admin") { navigate("/pedido", { replace: true }); return; }
  }, [navigate]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    navigate("/login", { replace: true });
  }

  // cargar empleados
  async function cargarEmpleados() {
    try {
      const data = await apiGet("/api/empleados");
      setEmpleados(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando empleados:", e);
    }
  }

  // cargar facturas
  async function cargarFacturas(fIni = fechaDesde, fFin = fechaHasta, emp = idEmpleado) {
    try {
      setMsgFacturas("Cargando facturas...");

      const params = new URLSearchParams();
      if (fIni) params.append("fecha_desde", fIni);
      if (fFin) params.append("fecha_hasta", fFin);
      if (emp) params.append("id_empleado", emp);

      const url = `/api/facturas${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await apiGet(url);

      const lista = Array.isArray(data) ? data : [];
      setFacturas(lista);
      setMsgFacturas(
        lista.length ? `Mostrando ${lista.length} facturas` : "Sin facturas registradas."
      );
    } catch (e) {
      console.error("Error cargando facturas:", e);
      setFacturas([]);
      setMsgFacturas("Error cargando facturas.");
    }
  }

  // ver detalle
  async function verDetalleFactura(idFactura) {
    try {
      const data = await apiGet(`/api/facturas/${idFactura}/detalle`);
      setDetalle(data); // { factura, productos }
      setShowModal(true);
    } catch (e) {
      console.error("Error cargando detalle:", e);
      alert("Error al cargar el detalle de la factura");
    }
  }

  // init
  useEffect(() => {
    cargarEmpleados();
    cargarFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aplicarFiltros() {
    cargarFacturas(fechaDesde, fechaHasta, idEmpleado);
  }

  return (
    <>
      <main className="container my-4">
        {/* Encabezado */}
        <section className="hero mb-4 text-center">
          <h1 className="display-6 fw-bold mb-2">Gestión de Facturas</h1>
          <p className="lead mb-0">Consulta y gestiona todas las facturas del sistema.</p>
        </section>

        {/* Filtros */}
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

        {/* Lista de facturas */}
        <div className="card card-soft">
          <div className="card-body">
            <h5 className="mb-3">Facturas Registradas</h5>
            <div className="table-responsive">
              <table className="table align-middle" id="tablaFacturas">
                <thead>
                  <tr>
                    <th>ID Factura</th>
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
                  {facturas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted">
                        No hay facturas registradas
                      </td>
                    </tr>
                  ) : (
                    facturas.map((f) => (
                      <tr key={f.id_factura}>
                        <td>#{f.id_factura}</td>
                        <td>{new Date(f.fecha_hora).toLocaleString("es-CO")}</td>
                        <td>{f.empleado_nombres || "N/A"}</td>
                        <td>{f.observaciones || "Cliente no registrado"}</td>
                        <td className="text-end">{money(f.total_bruto)}</td>
                        <td className="text-end">{money(f.descuento_total)}</td>
                        <td className="text-end fw-semibold">{money(f.total_neto)}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-primary"
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
        </div>
      </main>

      {/* Modal Detalle */}
      {showModal && detalle && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-lg" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Detalle de Factura #{detalle.factura?.id_factura}
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
                      <span>
                        {new Date(detalle.factura?.fecha_hora).toLocaleString("es-CO")}
                      </span>
                      <br />
                      <strong>Empleado:</strong>{" "}
                      <span>{detalle.factura?.empleado_nombres || "N/A"}</span>
                    </div>
                    <div className="col-md-6">
                      <strong>Cliente:</strong>{" "}
                      <span>{detalle.factura?.observaciones || "Cliente no registrado"}</span>
                      <br />
                      <strong>Total:</strong>{" "}
                      <span>{money(detalle.factura?.total_neto)}</span>
                    </div>
                  </div>

                  <h6>Productos:</h6>
                  <div className="table-responsive">
                    <table className="table table-sm" id="tablaDetalleProductos">
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
                              <td className="text-end">{money(p.subtotal_linea)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="text-center text-muted">
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
