import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

const getToken = () => localStorage.getItem("token") || "";

export default function Pedido() {
  const navigate = useNavigate();

  // =========================
  // Auth
  // =========================
  useEffect(() => {
    const t = getToken();
    if (!t) navigate("/login", { replace: true });
  }, [navigate]);

  // =========================
  // Estados principales
  // =========================
  const [productos, setProductos] = useState([]);
  const [pedido, setPedido] = useState([]);
  const [descuento, setDescuento] = useState(0);
  const [cliente, setCliente] = useState("");
  const [pago, setPago] = useState(0);
  const [metodoPago, setMetodoPago] = useState("");
  const [metodosPago, setMetodosPago] = useState([]);

  // =========================
  // Cargar productos
  // =========================
  async function cargarProductos() {
    setProductos([]);
    try {
      const res = await fetch("/api/productos", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setProductos(Array.isArray(data) ? data : []);
    } catch {
      setProductos([]);
    }
  }

  // =========================
  // Métodos de pago (simulado)
  // =========================
  function cargarMetodosPago() {
    const fake = [
      { id: 1, nombre_metodo: "Efectivo", description: "Pago en caja", activo: true },
      { id: 2, nombre_metodo: "Transferencia", description: "Nequi/Daviplata", activo: true },
    ];
    setMetodosPago(fake.filter((m) => m.activo));
  }

  useEffect(() => {
    cargarProductos();
    cargarMetodosPago();
  }, []);

  // =========================
  // Manejo del pedido
  // =========================
  function agregarProducto(id) {
    const p = productos.find((x) => x.id === id);
    if (!p) return;

    setPedido((prev) => {
      const existe = prev.find((i) => i.id === id);
      if (existe) {
        if (existe.cantidad + 1 > p.stock) {
          alert("No hay más stock disponible.");
          return prev;
        }
        return prev.map((i) =>
          i.id === id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 }];
    });
  }

  function quitarProducto(id) {
    setPedido((prev) => prev.filter((i) => i.id !== id));
  }

  function cambiarCantidad(id, val) {
    const nueva = Number(val);
    if (nueva < 1) return;

    const prod = productos.find((p) => p.id === id);
    if (nueva > prod.stock) {
      alert("No hay suficiente stock.");
      return;
    }

    setPedido((prev) =>
      prev.map((i) => (i.id === id ? { ...i, cantidad: nueva } : i))
    );
  }

  function vaciarPedido() {
    setPedido([]);
  }

  const subtotal = pedido.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const total = Math.max(subtotal - descuento, 0);
  const cambio = Math.max(pago - total, 0);

  // =========================
  // Cobrar
  // =========================
  async function cobrar() {
    if (!pedido.length) return alert("No hay productos.");
    if (!metodoPago) return alert("Seleccione método de pago.");
    if (pago < total) return alert("El pago es insuficiente.");

    const payload = {
      cliente,
      subtotal,
      descuento,
      total,
      metodo_pago: metodoPago,
      productos: pedido.map((p) => ({
        id: p.id,
        cantidad: p.cantidad,
        precio: p.precio,
      })),
    };

    try {
      const res = await fetch("/api/facturas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert("✅ Factura registrada");
      setPedido([]);
      setCliente("");
      setPago(0);
      setDescuento(0);
      setMetodoPago("");
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  }

  return (
    <>
      {/* NAV */}
      <nav className="navbar navbar-expand-lg border-bottom sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-semibold" to="/">
            🍨 GelatoPro
          </Link>
          <button className="btn btn-sm btn-outline-secondary ms-lg-3" onClick={() => navigate("/login")}>
            Cerrar turno
          </button>
        </div>
      </nav>

      <main className="container my-4">
        <div className="row g-4">

          {/* Constructor */}
          <div className="col-lg-8">
            <div className="card card-soft mb-4">
              <div className="card-body">

                <h5>Armar pedido</h5>
                <span className="small-muted">
                  Paso 1: producto → Paso 2: tamaño → Paso 3: toppings (si aplica)
                </span>
                <hr />

                {/* Productos */}
                <h6 className="mb-3">1. Elige un producto</h6>
                <div className="row g-3">
                  {productos.length === 0 && (
                    <div className="text-muted text-center">Cargando...</div>
                  )}

                  {productos.map((p) => (
                    <div className="col-6 col-md-4 col-xl-3" key={p.id}>
                      <div className="card card-soft h-100">
                        <img
                          src={p.img}
                          alt={p.nombre}
                          className="card-img-top"
                          style={{ objectFit: "cover", height: 110 }}
                        />
                        <div className="card-body p-2 d-flex flex-column">
                          <div className="fw-semibold">{p.nombre}</div>
                          <div className="small text-muted">{money(p.precio)}</div>
                          <div className={`small ${p.stock > 0 ? "text-success" : "text-danger"}`}>
                            Stock: {p.stock}
                          </div>
                          <button
                            className="btn btn-primary btn-sm mt-auto"
                            disabled={p.stock <= 0}
                            onClick={() => agregarProducto(p.id)}
                          >
                            Agregar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <hr />

                {/* Acciones rápidas */}
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-danger btn-sm" onClick={vaciarPedido}>
                    Vaciar pedido
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="col-lg-4">
            <div className="card card-soft sticky-summary">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <h5>Resumen</h5>
                  <span className="badge text-bg-light">Ticket</span>
                </div>

                <hr />

                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-center">Cant</th>
                      <th className="text-end">Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {!pedido.length && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted">
                          Sin productos
                        </td>
                      </tr>
                    )}

                    {pedido.map((i) => (
                      <tr key={i.id}>
                        <td>{i.nombre}</td>
                        <td className="text-center">
                          <input
                            type="number"
                            className="form-control form-control-sm text-center"
                            style={{ width: 60 }}
                            value={i.cantidad}
                            min={1}
                            onChange={(e) => cambiarCantidad(i.id, e.target.value)}
                          />
                        </td>
                        <td className="text-end">{money(i.precio * i.cantidad)}</td>
                        <td className="text-end">
                          <button className="btn btn-outline-danger btn-sm" onClick={() => quitarProducto(i.id)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="d-flex justify-content-between">
                  <span className="small text-muted">Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>

                <div className="d-flex justify-content-between">
                  <span className="small text-muted">Descuento</span>
                  <span>{money(descuento)}</span>
                </div>

                <hr />

                <div className="d-flex justify-content-between fs-5 fw-semibold">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>

                <div className="mt-2 p-2 border rounded">
                  <label className="form-label small mb-1">Cliente (opcional)</label>
                  <input
                    className="form-control form-control-sm"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                  />
                </div>

                <div className="mt-2">
                  <label className="form-label small mb-1">Metodo de pago</label>
                  <select
                    className="form-select form-select-sm"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  >
                    <option value="">Seleccione...</option>
                    {metodosPago.map((m) => (
                      <option key={m.id} value={m.nombre_metodo}>
                        {m.nombre_metodo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2 row g-2">
                  <div className="col-7">
                    <label className="form-label small">Pagó $</label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      className="form-control form-control-sm"
                      value={pago}
                      onChange={(e) => setPago(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-5">
                    <label className="form-label small">Cambio</label>
                    <div className="form-control form-control-sm bg-light d-flex align-items-center">
                      {money(cambio)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 d-grid">
                  <button className="btn btn-success" disabled={!pedido.length} onClick={cobrar}>
                    Cobrar
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
