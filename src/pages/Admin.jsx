import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

const getToken = () => localStorage.getItem("token") || "";

export default function Admin() {
  const navigate = useNavigate();

  // auth check
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

  // estado productos
  const [productos, setProductos] = useState([]);
  const [msgTabla, setMsgTabla] = useState("Cargando productos...");

  // formulario
  const [form, setForm] = useState({
    id: "",
    nombre: "",
    precio: "",
    stock: "",
    img: "",
    permiteToppings: "1",
  });
  const [msgForm, setMsgForm] = useState({ text: "", type: "muted" }); // success | danger | muted
  const editMode = useMemo(() => !!form.id, [form.id]);

  // cargar productos
  async function cargarProductos() {
    setMsgTabla("Cargando productos...");
    try {
      const res = await fetch("/api/productos", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        setMsgTabla("No autorizado o error cargando.");
        setProductos([]);
        return;
      }
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
      setMsgTabla(
        Array.isArray(data) && data.length
          ? `Total productos: ${data.length}`
          : "Sin productos en catálogo."
      );
    } catch (e) {
      console.error("Error cargando productos", e);
      setMsgTabla("Error cargando productos.");
      setProductos([]);
    }
  }

  useEffect(() => { cargarProductos(); }, []);

  // handlers form
  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function startEditar(p) {
    setForm({
      id: p.id,
      nombre: p.nombre || "",
      precio: String(p.precio ?? ""),
      stock: String(p.stock ?? ""),
      img: p.img || "",
      permiteToppings: p.permiteToppings ? "1" : "0",
    });
    setMsgForm({ text: "", type: "muted" });
  }

  function resetForm() {
    setForm({
      id: "",
      nombre: "",
      precio: "",
      stock: "",
      img: "",
      permiteToppings: "1",
    });
    setMsgForm({ text: "", type: "muted" });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsgForm({ text: "Guardando...", type: "muted" });

    // validar
    const body = {
      nombre: form.nombre.trim(),
      precio: Number(form.precio),
      stock: Number(form.stock),
      img: form.img.trim(),
      permiteToppings: form.permiteToppings === "1" ? 1 : 0,
    };
    if (!body.nombre || isNaN(body.precio) || isNaN(body.stock)) {
      setMsgForm({ text: "Nombre, precio y stock son obligatorios.", type: "danger" });
      return;
    }

    try {
      let res;
      if (editMode) {
        res = await fetch(`/api/productos/${form.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/productos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsgForm({ text: data.message || "Error al guardar.", type: "danger" });
        return;
      }

      setMsgForm({ text: "Guardado correctamente.", type: "success" });
      resetForm();
      await cargarProductos();
    } catch (e) {
      console.error(e);
      setMsgForm({ text: "Error al conectar con el servidor.", type: "danger" });
    }
  }

  async function eliminarProducto(id) {
    if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "No se pudo eliminar");
        return;
      }
      await cargarProductos();
    } catch (e) {
      console.error(e);
      alert("Error al conectar con el servidor.");
    }
  }

  return (
    <>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg border-bottom sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-semibold" to="/">🍨 GelatoPro</Link>
          <div className="d-flex flex-wrap gap-2">
            <Link className="btn btn-sm btn-outline-brand" to="/pedido">Caja / Pedido</Link>
            <Link className="btn btn-sm btn-outline-brand" to="/admin/auditoria">Auditoría</Link>
            <Link className="btn btn-sm btn-outline-brand" to="/admin/facturas">Facturas</Link>
            <button onClick={logout} className="btn btn-sm btn-outline-secondary">Cerrar sesión</button>
          </div>
        </div>
      </nav>

      <main className="container my-4">
        {/* Encabezado */}
        <section className="hero mb-4 text-center">
          <h1 className="display-6 fw-bold mb-2">Panel administrador</h1>
          <p className="lead mb-0">Gestiona el catálogo que verá la caja al armar pedidos.</p>
        </section>

        <div className="row g-4">
          {/* Formulario Crear / Editar */}
          <div className="col-lg-4">
            <div className="card card-soft h-100">
              <div className="card-body">
                <h5 className="mb-3" id="formTitle">{editMode ? "Editar producto" : "Nuevo producto"}</h5>

                <form onSubmit={onSubmit} id="formProducto">
                  <input type="hidden" name="id" value={form.id} />

                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      name="nombre"
                      value={form.nombre}
                      onChange={onChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Precio base (COP)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="precio"
                      min="0"
                      step="100"
                      value={form.precio}
                      onChange={onChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Stock inicial / actual</label>
                    <input
                      type="number"
                      className="form-control"
                      name="stock"
                      min="0"
                      step="1"
                      value={form.stock}
                      onChange={onChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">URL Imagen</label>
                    <input
                      type="url"
                      className="form-control"
                      name="img"
                      placeholder="https://ejemplo.com/helado.jpg"
                      value={form.img}
                      onChange={onChange}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">¿Permite toppings?</label>
                    <select
                      className="form-select"
                      name="permiteToppings"
                      value={form.permiteToppings}
                      onChange={onChange}
                    >
                      <option value="1">Sí</option>
                      <option value="0">No</option>
                    </select>
                  </div>

                  <div className="d-grid gap-2">
                    <button type="submit" className="btn btn-brand" id="btnGuardar">
                      {editMode ? "Actualizar" : "Guardar producto"}
                    </button>
                    {editMode && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        id="btnCancelarEdicion"
                        onClick={resetForm}
                      >
                        Cancelar edición
                      </button>
                    )}
                  </div>

                  {msgForm.text && (
                    <p className={`small mt-3 mb-0 text-${msgForm.type}`} id="msgForm">
                      {msgForm.text}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* Tabla productos */}
          <div className="col-lg-8">
            <div className="card card-soft">
              <div className="card-body">
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Productos actuales</h5>
                  <small className="text-muted">Estos salen en la pantalla de Pedido</small>
                </div>

                <div className="table-responsive">
                  <table className="table align-middle" id="tablaAdminProductos">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th className="text-center">Precio</th>
                        <th className="text-center">Stock</th>
                        <th className="text-center">Toppings</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-muted py-4">
                            No hay productos aún.
                          </td>
                        </tr>
                      ) : (
                        productos.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                {p.img ? (
                                  <img
                                    src={p.img}
                                    alt={p.nombre}
                                    style={{
                                      width: 48,
                                      height: 48,
                                      objectFit: "cover",
                                      borderRadius: 8,
                                      border: "1px solid #ddd",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: 48,
                                      height: 48,
                                      borderRadius: 8,
                                      border: "1px dashed #ddd",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 12,
                                      color: "#888",
                                    }}
                                  >
                                    sin img
                                  </div>
                                )}
                                <div>
                                  <div className="fw-semibold">{p.nombre}</div>
                                  <div className="small text-muted">ID: {p.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="text-center">{money(p.precio)}</td>
                            <td className="text-center">{p.stock}</td>
                            <td className="text-center">
                              {p.permiteToppings ? (
                                <span className="badge text-bg-success">Sí</span>
                              ) : (
                                <span className="badge text-bg-secondary">No</span>
                              )}
                            </td>
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-outline-brand me-2"
                                onClick={() => startEditar(p)}
                              >
                                Editar
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => eliminarProducto(p.id)}
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="small text-muted mt-2 mb-0" id="msgTabla">
                  {msgTabla}
                </p>
              </div>
            </div>
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
