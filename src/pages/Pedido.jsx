import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

const getToken = () => localStorage.getItem("token") || "";

export default function Pedido() {
  const navigate = useNavigate();

  // =========================
  // Estados principales
  // =========================
  const [categorias, setCategorias] = useState([]);
  const [tamanos, setTamanos] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [pedido, setPedido] = useState([]);
  const [descuento, setDescuento] = useState(0);
  const [cliente, setCliente] = useState("");
  const [pago, setPago] = useState(0);
  const [metodoPago, setMetodoPago] = useState("");
  const [metodosPago, setMetodosPago] = useState([]);

  // Estados para el flujo de selección
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [tamanoSeleccionado, setTamanoSeleccionado] = useState(null);
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
      // Cargar categorías con productos
      const [resProductos, resTamanos, resToppings] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/productos`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/tamanos`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/toppings`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
      ]);

      if (!resProductos.ok || !resTamanos.ok || !resToppings.ok) {
        throw new Error("Error cargando datos");
      }

      const dataProductos = await resProductos.json();
      const dataTamanos = await resTamanos.json();
      const dataToppings = await resToppings.json();

      setCategorias(Array.isArray(dataProductos) ? dataProductos : []);
      setTamanos(Array.isArray(dataTamanos) ? dataTamanos : []);
      setToppings(Array.isArray(dataToppings) ? dataToppings : []);

    } catch (error) {
      console.error("Error cargando datos:", error);
      alert("Error cargando los datos del sistema");
    } finally {
      setCargando(false);
    }
  }

  // Cargar métodos de pago
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
  // Manejo del flujo de selección
  // =========================
  function seleccionarProducto(producto) {
    if (producto.stock <= 0) {
      alert("Este producto no tiene stock disponible");
      return;
    }
    setProductoSeleccionado(producto);
    setTamanoSeleccionado(null);
    setToppingsSeleccionados([]);
  }

  function seleccionarTamano(tamano) {
    setTamanoSeleccionado(tamano);
  }

  function toggleTopping(topping) {
    setToppingsSeleccionados(prev => {
      const existe = prev.find(t => t.id_topping === topping.id_topping);
      if (existe) {
        return prev.filter(t => t.id_topping !== topping.id_topping);
      } else {
        return [...prev, topping];
      }
    });
  }

  function calcularPrecioFinal() {
    if (!productoSeleccionado || !tamanoSeleccionado) return 0;

    let precioBase = productoSeleccionado.precio * tamanoSeleccionado.multiplicador;
    const precioToppings = toppingsSeleccionados.reduce((sum, topping) => 
      sum + topping.precio_adicional, 0);
    
    return Math.round(precioBase + precioToppings);
  }

  function agregarAlPedido() {
    if (!productoSeleccionado || !tamanoSeleccionado) {
      alert("Selecciona un producto y tamaño primero");
      return;
    }

    const precioFinal = calcularPrecioFinal();
    const itemPedido = {
      id: `${productoSeleccionado.id}-${tamanoSeleccionado.id_tamano}-${Date.now()}`,
      producto: productoSeleccionado,
      tamano: tamanoSeleccionado,
      toppings: [...toppingsSeleccionados],
      cantidad: 1,
      precioUnitario: precioFinal,
      subtotal: precioFinal
    };

    setPedido(prev => [...prev, itemPedido]);
    resetSeleccion();
    
    // Mostrar confirmación
    alert(`✅ ${productoSeleccionado.nombre} (${tamanoSeleccionado.nombre}) agregado al pedido`);
  }

  function resetSeleccion() {
    setProductoSeleccionado(null);
    setTamanoSeleccionado(null);
    setToppingsSeleccionados([]);
  }

  // =========================
  // Manejo del pedido existente
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
    if (pedido.length === 0) return;
    if (confirm("¿Estás seguro de que quieres vaciar el pedido?")) {
      setPedido([]);
    }
  }

  // =========================
  // Cálculos
  // =========================
  const subtotal = pedido.reduce((sum, i) => sum + i.subtotal, 0);
  const total = Math.max(subtotal - descuento, 0);
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
      descuento,
      total,
      metodo_pago: metodoPago,
      productos: pedido.map((item) => ({
        id: item.producto.id,
        cantidad: item.cantidad,
        precio: item.precioUnitario,
        tamano: item.tamano.nombre,
        toppings: item.toppings.map(t => t.id_topping)
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
      
      // Resetear todo después de cobrar
      setPedido([]);
      setCliente("");
      setPago(0);
      setDescuento(0);
      setMetodoPago("");
      
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  }

  if (cargando) {
    return (
      <>
        <nav className="navbar navbar-expand-lg border-bottom sticky-top">
          <div className="container">
            <Link className="navbar-brand fw-semibold" to="/">
              🍨 GelatoPro
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
            🍨 GelatoPro - Caja
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
                <span className="small text-muted">
                  Paso 1: producto → Paso 2: tamaño → Paso 3: toppings (si aplica)
                </span>
                <hr />

                {/* Paso 1: Selección de Producto por Categorías */}
                {!productoSeleccionado && (
                  <div>
                    <h6 className="mb-3">1. Elige un producto por categoría</h6>
                    {categorias.length === 0 ? (
                      <div className="alert alert-warning">
                        No hay productos disponibles. Contacta al administrador.
                      </div>
                    ) : (
                      categorias.map(categoria => (
                        <div key={categoria.id} className="mb-4">
                          <h6 className="text-primary mb-2 border-bottom pb-1">
                            {categoria.nombre}
                          </h6>
                          <div className="row g-3">
                            {categoria.productos.map((producto) => (
                              <div className="col-6 col-md-4 col-xl-3" key={producto.id}>
                                <div 
                                  className={`card h-100 ${producto.stock <= 0 ? 'opacity-50' : 'hover-lift'}`}
                                  style={{ 
                                    cursor: producto.stock > 0 ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.3s ease'
                                  }}
                                  onClick={() => seleccionarProducto(producto)}
                                >
                                  <img
                                    src={producto.img || '/placeholder-image.jpg'}
                                    alt={producto.nombre}
                                    className="card-img-top"
                                    style={{ 
                                      objectFit: "cover", 
                                      height: 110,
                                      backgroundColor: '#f8f9fa'
                                    }}
                                    onError={(e) => {
                                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjExMCIgdmlld0JveD0iMCAwIDIwMCAxMTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTEwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik04MCA1NUw3MCA0NUg2MEw1MCA1NUw2MCA2NUg3MEw4MCA1NVoiIGZpbGw9IiNENkQ2RDYiLz4KPHN2Zz4K';
                                    }}
                                  />
                                  <div className="card-body p-2 d-flex flex-column">
                                    <div className="fw-semibold small">{producto.nombre}</div>
                                    <div className="small text-muted">{money(producto.precio)}</div>
                                    <div className={`small ${producto.stock > 0 ? "text-success" : "text-danger"}`}>
                                      Stock: {producto.stock}
                                    </div>
                                    {producto.permiteToppings && (
                                      <span className="badge bg-info mt-1 small">Incluye toppings</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Paso 2: Selección de Tamaño */}
                {productoSeleccionado && !tamanoSeleccionado && (
                  <div>
                    <div className="d-flex align-items-center mb-3">
                      <button 
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={resetSeleccion}
                      >
                        ← Volver
                      </button>
                      <h6 className="mb-0">2. Elige el tamaño para: <strong>{productoSeleccionado.nombre}</strong></h6>
                    </div>
                    
                    <div className="row g-3">
                      {tamanos.length === 0 ? (
                        <div className="col-12">
                          <div className="alert alert-warning">
                            No hay tamaños configurados. Contacta al administrador.
                          </div>
                        </div>
                      ) : (
                        tamanos.map(tamano => (
                          <div className="col-6 col-md-4" key={tamano.id_tamano}>
                            <div 
                              className={`card text-center hover-lift ${tamanoSeleccionado?.id_tamano === tamano.id_tamano ? 'border-primary border-2' : ''}`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => seleccionarTamano(tamano)}
                            >
                              <div className="card-body">
                                <h6 className="card-title">{tamano.nombre}</h6>
                                <div className="text-muted small">{tamano.descripcion}</div>
                                <div className="fw-semibold text-success mt-2">
                                  {money(productoSeleccionado.precio * tamano.multiplicador)}
                                </div>
                                {tamano.multiplicador > 1 && (
                                  <div className="small text-muted">
                                    +{money(productoSeleccionado.precio * tamano.multiplicador - productoSeleccionado.precio)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Paso 3: Selección de Toppings (si aplica) */}
                {productoSeleccionado && tamanoSeleccionado && productoSeleccionado.permiteToppings && (
                  <div>
                    <div className="d-flex align-items-center mb-3">
                      <button 
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => setTamanoSeleccionado(null)}
                      >
                        ← Volver
                      </button>
                      <h6 className="mb-0">
                        3. Elige toppings para: <strong>{productoSeleccionado.nombre}</strong> ({tamanoSeleccionado.nombre})
                      </h6>
                    </div>

                    <div className="row g-2 mb-3">
                      {toppings.length === 0 ? (
                        <div className="col-12">
                          <div className="alert alert-info">
                            No hay toppings disponibles. Continuar sin toppings.
                          </div>
                        </div>
                      ) : (
                        toppings.map(topping => (
                          <div className="col-6 col-md-4 col-lg-3" key={topping.id_topping}>
                            <div 
                              className={`card text-center hover-lift ${toppingsSeleccionados.find(t => t.id_topping === topping.id_topping) ? 'border-success border-2 bg-light' : ''}`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => toggleTopping(topping)}
                            >
                              <div className="card-body p-2">
                                <h6 className="card-title small mb-1">{topping.nombre}</h6>
                                <div className="text-success small">+{money(topping.precio_adicional)}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="card bg-light">
                      <div className="card-body">
                        <div className="row align-items-center">
                          <div className="col">
                            <strong>Total del item:</strong> 
                            <span className="fs-5 ms-2 text-success">{money(calcularPrecioFinal())}</span>
                            {toppingsSeleccionados.length > 0 && (
                              <div className="small text-muted mt-1">
                                <strong>Toppings seleccionados:</strong> {toppingsSeleccionados.map(t => t.nombre).join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="col-auto">
                            <button 
                              className="btn btn-success btn-lg"
                              onClick={agregarAlPedido}
                            >
                              Agregar al Pedido
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Si el producto no permite toppings, mostrar botón directo */}
                {productoSeleccionado && tamanoSeleccionado && !productoSeleccionado.permiteToppings && (
                  <div>
                    <div className="d-flex align-items-center mb-3">
                      <button 
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => setTamanoSeleccionado(null)}
                      >
                        ← Volver
                      </button>
                      <h6 className="mb-0">
                        Listo para agregar: <strong>{productoSeleccionado.nombre}</strong> ({tamanoSeleccionado.nombre})
                      </h6>
                    </div>

                    <div className="card bg-light">
                      <div className="card-body">
                        <div className="row align-items-center">
                          <div className="col">
                            <strong>Total del item:</strong> 
                            <span className="fs-5 ms-2 text-success">{money(calcularPrecioFinal())}</span>
                          </div>
                          <div className="col-auto">
                            <button 
                              className="btn btn-success btn-lg"
                              onClick={agregarAlPedido}
                            >
                              Agregar al Pedido
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <hr />

                {/* Acciones rápidas */}
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-outline-danger btn-sm" 
                    onClick={vaciarPedido}
                    disabled={pedido.length === 0}
                  >
                    Vaciar pedido
                  </button>
                  {productoSeleccionado && (
                    <button className="btn btn-outline-secondary btn-sm" onClick={resetSeleccion}>
                      Cancelar selección
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resumen del Pedido */}
          <div className="col-lg-4">
            <div className="card card-soft sticky-top" style={{ top: '100px' }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <h5>Resumen del Pedido</h5>
                  <span className="badge text-bg-light">Ticket</span>
                </div>

                <hr />

                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
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
                              <div className="fw-semibold small">{item.producto.nombre}</div>
                              <div className="small text-muted">
                                {item.tamano.nombre}
                                {item.toppings.length > 0 && (
                                  <div className="mt-1">
                                    <small className="text-info">
                                      + {item.toppings.map(t => t.nombre).join(', ')}
                                    </small>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-center">
                            <input
                              type="number"
                              className="form-control form-control-sm text-center"
                              style={{ width: 60 }}
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
                      style={{ width: 100 }}
                      value={descuento}
                      min={0}
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
                    className="btn btn-success btn-lg" 
                    disabled={!pedido.length || !metodoPago}
                    onClick={cobrar}
                  >
                    {pedido.length ? `Cobrar ${money(total)}` : 'Cobrar'}
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