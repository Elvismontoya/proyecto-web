import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

const getToken = () => localStorage.getItem("token") || "";

// Helpers para soportar distintos nombres de campos según el backend
const getProductoId = (p) => p.id ?? p.id_producto;
const getProductoNombre = (p) => p.nombre ?? p.nombre_producto;
const getProductoPrecio = (p) => p.precio ?? p.precio_venta_unitario ?? 0;
const getProductoStock = (p) => p.stock ?? p.stock_actual ?? 0;
const getProductoPermiteToppings = (p) => p.permiteToppings ?? p.permite_toppings ?? false;

const getToppingNombre = (t) => t.nombre ?? t.nombre_topping;
const getToppingPrecioExtra = (t) =>
  t.precio_adicional ?? t.precio ?? 0;

export default function Pedido() {
  const navigate = useNavigate();

  // =========================
  // Estados principales
  // =========================
  const [categorias, setCategorias] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [pedido, setPedido] = useState([]);
  const [descuento, setDescuento] = useState(0);
  const [cliente, setCliente] = useState("");
  const [pago, setPago] = useState(0);
  const [metodoPago, setMetodoPago] = useState("");
  const [metodosPago, setMetodosPago] = useState([]);

  // Flujo
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [toppingsSeleccionados, setToppingsSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(true);

  // =========================
  // Auth
  // =========================
  useEffect(() => {
    const t = getToken();
    if (!t) navigate("/login", { replace: true });
  }, [navigate]);

  // =========================
  // Cargar datos
  // =========================
  async function cargarDatos() {
    setCargando(true);
    try {
      const [resProductos, resToppings] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/productos`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/toppings`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      if (!resProductos.ok || !resToppings.ok) {
        throw new Error("Error cargando datos");
      }

      const dataProductos = await resProductos.json();
      const dataToppings = await resToppings.json();

      setCategorias(Array.isArray(dataProductos) ? dataProductos : []);
      setToppings(Array.isArray(dataToppings) ? dataToppings : []);
    } catch (error) {
      console.error("Error cargando datos:", error);
      alert("Error cargando los datos del sistema");
    } finally {
      setCargando(false);
    }
  }

  function cargarMetodosPago() {
    const fake = [
      { id: 1, nombre_metodo: "Efectivo", description: "Pago en caja", activo: true },
      { id: 2, nombre_metodo: "Transferencia", description: "Nequi/Daviplata", activo: true },
      { id: 3, nombre_metodo: "Tarjeta", description: "Pago con tarjeta", activo: true },
    ];
    setMetodosPago(fake.filter((m) => m.activo));
  }

  useEffect(() => {
    cargarDatos();
    cargarMetodosPago();
  }, []);

  // =========================
  // Manejo de selección
  // =========================
  function seleccionarProducto(producto) {
    const stock = getProductoStock(producto);
    if (stock <= 0) {
      alert("Este producto no tiene stock disponible");
      return;
    }
    setProductoSeleccionado(producto);
    setToppingsSeleccionados([]);
  }

  function toggleTopping(topping) {
    setToppingsSeleccionados((prev) => {
      const existe = prev.find((t) => t.id_topping === topping.id_topping);
      return existe ? prev.filter((t) => t.id_topping !== topping.id_topping) : [...prev, topping];
    });
  }

  const precioFinal = useMemo(() => {
    if (!productoSeleccionado) return 0;
    const base = Number(getProductoPrecio(productoSeleccionado));
    const extra = toppingsSeleccionados.reduce(
      (s, t) => s + Number(getToppingPrecioExtra(t)),
      0
    );
    return Math.round(base + extra);
  }, [productoSeleccionado, toppingsSeleccionados]);

  function agregarAlPedido() {
    if (!productoSeleccionado) {
      alert("Selecciona un producto primero");
      return;
    }

    const prodId = getProductoId(productoSeleccionado);
    const prodNombre = getProductoNombre(productoSeleccionado);

    const itemPedido = {
      id: `${prodId}-${Date.now()}`,
      producto: productoSeleccionado,
      tamano: "Único", // tamaño lógico, ya no hay tabla de tamaños
      toppings: [...toppingsSeleccionados],
      cantidad: 1,
      precioUnitario: precioFinal,
      subtotal: precioFinal,
    };

    setPedido((prev) => [...prev, itemPedido]);
    resetSeleccion();
    alert(`✅ ${prodNombre} agregado al pedido`);
  }

  function resetSeleccion() {
    setProductoSeleccionado(null);
    setToppingsSeleccionados([]);
  }

  // =========================
  // Pedido existente
  // =========================
  function quitarProducto(id) {
    setPedido((prev) => prev.filter((i) => i.id !== id));
  }

  function cambiarCantidad(id, val) {
    const nuevaCantidad = Number(val);
    if (nuevaCantidad < 1) return;

    setPedido((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const nuevoSubtotal = i.precioUnitario * nuevaCantidad;
          return { ...i, cantidad: nuevaCantidad, subtotal: nuevoSubtotal };
        }
        return i;
      })
    );
  }

  function vaciarPedido() {
    if (!pedido.length) return;
    if (confirm("¿Estás seguro de que quieres vaciar el pedido?")) setPedido([]);
  }

  // =========================
  // Cálculos
  // =========================
  const subtotal = pedido.reduce((sum, i) => sum + i.subtotal, 0);
  const descuentoNormalizado = Math.max(0, Math.min(descuento, subtotal)); // evita negativo
  const total = Math.max(subtotal - descuentoNormalizado, 0);
  const cambio = Math.max(pago - total, 0);

  // =========================
  // Cobrar
  // =========================
  async function cobrar() {
    if (!pedido.length) return alert("No hay productos en el pedido.");
    if (!metodoPago) return alert("Seleccione método de pago.");
    if (pago < total) return alert("El pago es insuficiente.");

    const payload = {
      cliente,
      subtotal,
      descuento: descuentoNormalizado,
      total,
      metodo_pago: metodoPago,
      productos: pedido.map((item) => ({
        id: getProductoId(item.producto),
        cantidad: item.cantidad,
        precio: item.precioUnitario,
        tamano: item.tamano, // ahora es un string "Único"
        toppings: item.toppings.map((t) => t.id_topping),
      })),
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/facturas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(`✅ Factura #${data.id_factura} registrada correctamente`);

      // reset
      setPedido([]);
      setCliente("");
      setPago(0);
      setDescuento(0);
      setMetodoPago("");
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  }

  // =========================
  // UI
  // =========================
  if (cargando) {
    return (
      <>
        <nav className="navbar navbar-expand-lg border-bottom sticky-top">
          <div className="container">
            <Link className="navbar-brand fw-semibold" to="/">
              🍨 NixGelato
            </Link>
          </div>
        </nav>
        <main className="container my-4">
          <div className="text-center py-5">
            <div className="spinner-border text-brand" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-3">Cargando sistema de caja...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {/* NAV */}
      <nav className="navbar navbar-expand-lg border-bottom sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-semibold" to="/">
            🍨 NixGelato
          </Link>
          <div className="d-flex gap-2">
            <Link className="btn btn-sm btn-outline-brand" to="/admin">
              Admin
            </Link>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => navigate("/login")}
            >
              Cerrar turno
            </button>
          </div>
        </div>
      </nav>

      <main className="container my-4">
        <div className="row g-4">
          {/* Constructor */}
          <div className="col-lg-8">
            <div className="card card-soft mb-4 fade-in">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-1">Armar pedido</h5>
                  <span className="badge bg-primary">Flujo 2 pasos</span>
                </div>
                <p className="small text-muted mb-3">
                  1. Producto → 2. Toppings (si aplica)
                </p>

                {/* Paso 1: Producto por Categoría */}
                {!productoSeleccionado && (
                  <div className="stagger-children">
                    <h6 className="mb-3">1. Elige un producto por categoría</h6>
                    {categorias.length === 0 ? (
                      <div className="alert alert-warning">
                        No hay productos disponibles. Contacta al administrador.
                      </div>
                    ) : (
                      categorias.map((categoria) => (
                        <div key={categoria.id ?? categoria.id_categoria} className="mb-4">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <h6 className="text-primary mb-0">
                              {categoria.nombre}
                            </h6>
                            <span className="badge bg-light text-dark">
                              {categoria.productos?.length || 0} ítems
                            </span>
                          </div>
                          <div className="row g-3">
                            {categoria.productos?.map((producto) => {
                              const prodId = getProductoId(producto);
                              const prodNombre = getProductoNombre(producto);
                              const precio = getProductoPrecio(producto);
                              const stock = getProductoStock(producto);
                              const permiteToppings = getProductoPermiteToppings(producto);
                              return (
                                <div className="col-6 col-md-4 col-xl-3" key={prodId}>
                                  <div
                                    className={`card h-100 ${
                                      stock <= 0 ? "opacity-50" : "hover-lift"
                                    }`}
                                    style={{
                                      cursor: stock > 0 ? "pointer" : "not-allowed",
                                      transition: "all 0.3s ease",
                                    }}
                                    onClick={() => seleccionarProducto(producto)}
                                  >
                                    <div style={{ position: "relative" }}>
                                      {stock <= 0 && (
                                        <span
                                          className="badge bg-danger"
                                          style={{ position: "absolute", top: 8, left: 8 }}
                                        >
                                          Sin stock
                                        </span>
                                      )}
                                      <img
                                        src={producto.img || "/placeholder-image.jpg"}
                                        alt={prodNombre}
                                        className="card-img-top"
                                        style={{
                                          objectFit: "cover",
                                          height: 120,
                                          backgroundColor: "#f8f9fa",
                                        }}
                                        onError={(e) => {
                                          e.currentTarget.src =
                                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjExMCIgdmlld0JveD0iMCAwIDIwMCAxMTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTEwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik04MCA1NUw3MCA0NUg2MEw1MCA1NUw2MCA2NUg3MEw4MCA1NVoiIGZpbGw9IiNENkQ2RDYiLz4KPC9zdmc+";
                                        }}
                                      />
                                    </div>
                                    <div className="card-body p-2 d-flex flex-column">
                                      <div className="fw-semibold small">{prodNombre}</div>
                                      <div className="small text-muted">
                                        {money(precio)}
                                      </div>
                                      <div
                                        className={`small ${
                                          stock > 10
                                            ? "text-success"
                                            : stock > 0
                                            ? "text-warning"
                                            : "text-danger"
                                        }`}
                                      >
                                        Stock: {stock}
                                      </div>
                                      {permiteToppings && (
                                        <span className="badge bg-info mt-1 small">
                                          Permite toppings
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Paso 2: Toppings (si aplica) o confirmación directa */}
                {productoSeleccionado && (
                  <div className="fade-in">
                    <div className="d-flex align-items-center mb-3">
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={resetSeleccion}
                      >
                        ← Volver
                      </button>
                      <h6 className="mb-0">
                        {getProductoPermiteToppings(productoSeleccionado)
                          ? <>
                              2. Elige toppings para:{" "}
                              <strong>{getProductoNombre(productoSeleccionado)}</strong>
                            </>
                          : <>
                              Listo para agregar:{" "}
                              <strong>{getProductoNombre(productoSeleccionado)}</strong>
                            </>
                        }
                      </h6>
                    </div>

                    {getProductoPermiteToppings(productoSeleccionado) && (
                      <>
                        <div className="row g-2 mb-3">
                          {toppings.length === 0 ? (
                            <div className="col-12">
                              <div className="alert alert-info">
                                No hay toppings disponibles. Continuar sin toppings.
                              </div>
                            </div>
                          ) : (
                            toppings.map((topping) => {
                              const activo = !!toppingsSeleccionados.find(
                                (t) => t.id_topping === topping.id_topping
                              );
                              const nombreTop = getToppingNombre(topping);
                              const precioExtra = getToppingPrecioExtra(topping);
                              return (
                                <div
                                  className="col-6 col-md-4 col-lg-3"
                                  key={topping.id_topping}
                                >
                                  <div
                                    className={`card text-center hover-lift ${
                                      activo ? "border-success border-2 bg-light" : ""
                                    }`}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => toggleTopping(topping)}
                                  >
                                    <div className="card-body p-2">
                                      <h6 className="card-title small mb-1">
                                        {nombreTop}
                                      </h6>
                                      <div className="text-success small">
                                        +{money(precioExtra)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}

                    <div className="card bg-light">
                      <div className="card-body">
                        <div className="row align-items-center">
                          <div className="col">
                            <strong>Total del ítem:</strong>
                            <span className="fs-5 ms-2 text-success">
                              {money(precioFinal)}
                            </span>
                            {toppingsSeleccionados.length > 0 && (
                              <div className="small text-muted mt-1">
                                <strong>Toppings:</strong>{" "}
                                {toppingsSeleccionados
                                  .map((t) => getToppingNombre(t))
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                          <div className="col-auto">
                            <button
                              className="btn btn-brand btn-lg"
                              onClick={agregarAlPedido}
                            >
                              Agregar al pedido
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Acciones rápidas */}
                <hr />
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={vaciarPedido}
                    disabled={pedido.length === 0}
                  >
                    Vaciar pedido
                  </button>
                  {productoSeleccionado && (
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={resetSeleccion}
                    >
                      Cancelar selección
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resumen del Pedido */}
          <div className="col-lg-4">
            <div className="card card-soft sticky-top fade-in" style={{ top: "100px" }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Resumen del pedido</h5>
                  <span className="badge bg-light text-dark">Ticket</span>
                </div>

                <hr />

                <div className="table-responsive" style={{ maxHeight: 340 }}>
                  <table className="table align-middle">
                    <thead
                      style={{
                        position: "sticky",
                        top: 0,
                        background: "var(--white)",
                        zIndex: 1,
                      }}
                    >
                      <tr>
                        <th>Producto</th>
                        <th className="text-center">Cant</th>
                        <th className="text-end">Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {!pedido.length && (
                        <tr>
                          <td colSpan={4} className="text-center text-muted py-4">
                            No hay productos en el pedido
                          </td>
                        </tr>
                      )}

                      {pedido.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div>
                              <div className="fw-semibold small">
                                {getProductoNombre(item.producto)}
                              </div>
                              <div className="small text-muted">
                                {item.tamano}
                                {item.toppings.length > 0 && (
                                  <div className="mt-1">
                                    <small className="text-info">
                                      +{" "}
                                      {item.toppings
                                        .map((t) => getToppingNombre(t))
                                        .join(", ")}
                                    </small>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-center" style={{ minWidth: 80 }}>
                            <input
                              type="number"
                              className="form-control form-control-sm text-center"
                              value={item.cantidad}
                              min={1}
                              onChange={(e) => cambiarCantidad(item.id, e.target.value)}
                            />
                          </td>
                          <td className="text-end">{money(item.subtotal)}</td>
                          <td className="text-end">
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => quitarProducto(item.id)}
                              title="Eliminar del pedido"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between">
                  <span className="small text-muted">Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-2">
                  <span className="small text-muted">Descuento</span>
                  <div className="d-flex align-items-center gap-2">
                    <span className="small">$</span>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      style={{ width: 110 }}
                      value={descuento}
                      min={0}
                      max={subtotal}
                      onChange={(e) => setDescuento(Number(e.target.value))}
                    />
                  </div>
                </div>

                <hr />

                <div className="d-flex justify-content-between fs-5 fw-semibold">
                  <span>Total</span>
                  <span className="text-success">{money(total)}</span>
                </div>

                <div className="mt-3 p-2 border rounded">
                  <label className="form-label small mb-1">Cliente (opcional)</label>
                  <input
                    className="form-control form-control-sm"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Nombre del cliente"
                  />
                </div>

                <div className="mt-2">
                  <label className="form-label small mb-1">Método de pago *</label>
                  <select
                    className="form-select form-select-sm"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    required
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
                      placeholder="0"
                    />
                  </div>
                  <div className="col-5">
                    <label className="form-label small">Cambio</label>
                    <div className="form-control form-control-sm bg-light d-flex align-items-center justify-content-end fw-semibold">
                      {money(cambio)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 d-grid">
                  <button
                    className="btn btn-brand btn-lg"
                    disabled={!pedido.length || !metodoPago}
                    onClick={cobrar}
                  >
                    {pedido.length ? `Cobrar ${money(total)}` : "Cobrar"}
                  </button>
                </div>

                {pedido.length > 0 && !metodoPago && (
                  <div className="alert alert-warning mt-2 p-2 small">
                    Selecciona un método de pago para continuar
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
