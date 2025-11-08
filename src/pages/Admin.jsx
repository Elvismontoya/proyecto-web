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

  // =========================
  // Estados principales
  // =========================
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [msgTabla, setMsgTabla] = useState("Cargando productos...");
  const [activeTab, setActiveTab] = useState("productos");

  // =========================
  // Estados para formulario de productos
  // =========================
  const [formProducto, setFormProducto] = useState({
    id: "",
    nombre: "",
    precio: "",
    stock: "",
    img: "",
    permiteToppings: "1",
    id_categoria: ""
  });
  const [msgFormProducto, setMsgFormProducto] = useState({ text: "", type: "muted" });
  const editModeProducto = useMemo(() => !!formProducto.id, [formProducto.id]);

  // =========================
  // Estados para formulario de categorías
  // =========================
  const [formCategoria, setFormCategoria] = useState({
    id: "",
    nombre: "",
    descripcion: ""
  });
  const [msgFormCategoria, setMsgFormCategoria] = useState({ text: "", type: "muted" });
  const editModeCategoria = useMemo(() => !!formCategoria.id, [formCategoria.id]);

  // =========================
  // Cargar datos
  // =========================
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
      
      // Transformar los datos para que sean compatibles con el frontend
      const productosTransformados = transformarProductos(data);
      setProductos(Array.isArray(productosTransformados) ? productosTransformados : []);
      setMsgTabla(
        Array.isArray(productosTransformados) && productosTransformados.length
          ? `Total productos: ${productosTransformados.length}`
          : "Sin productos en catálogo."
      );
    } catch (e) {
      console.error("Error cargando productos", e);
      setMsgTabla("Error cargando productos.");
      setProductos([]);
    }
  }

  // Función para transformar los productos del backend al formato del frontend
  function transformarProductos(data) {
    if (!Array.isArray(data)) return [];
    
    return data.flatMap(categoria => 
      categoria.productos?.map(producto => ({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        stock: producto.stock,
        img: producto.img,
        permiteToppings: producto.permiteToppings,
        id_categoria: producto.id_categoria,
        categoria: categoria.nombre
      })) || []
    );
  }

  async function cargarCategorias() {
    try {
      const res = await fetch("/api/categorias", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategorias(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error cargando categorías", e);
      setCategorias([]);
    }
  }

  useEffect(() => {
    cargarProductos();
    cargarCategorias();
  }, []);

  // =========================
  // Handlers para Productos
  // =========================
  function onChangeProducto(e) {
    const { name, value } = e.target;
    setFormProducto((f) => ({ ...f, [name]: value }));
  }

  function startEditarProducto(p) {
    setFormProducto({
      id: p.id,
      nombre: p.nombre || "",
      precio: String(p.precio ?? ""),
      stock: String(p.stock ?? ""),
      img: p.img || "",
      permiteToppings: p.permiteToppings ? "1" : "0",
      id_categoria: p.id_categoria || ""
    });
    setMsgFormProducto({ text: "", type: "muted" });
  }

  function resetFormProducto() {
    setFormProducto({
      id: "",
      nombre: "",
      precio: "",
      stock: "",
      img: "",
      permiteToppings: "1",
      id_categoria: ""
    });
    setMsgFormProducto({ text: "", type: "muted" });
  }

  async function onSubmitProducto(e) {
    e.preventDefault();
    setMsgFormProducto({ text: "Guardando...", type: "muted" });

    const body = {
      nombre: formProducto.nombre.trim(),
      precio: Number(formProducto.precio),
      stock: Number(formProducto.stock),
      img: formProducto.img.trim(),
      permiteToppings: formProducto.permiteToppings === "1" ? 1 : 0,
      id_categoria: formProducto.id_categoria || null
    };

    if (!body.nombre || isNaN(body.precio) || isNaN(body.stock)) {
      setMsgFormProducto({ text: "Nombre, precio y stock son obligatorios.", type: "danger" });
      return;
    }

    try {
      let res;
      if (editModeProducto) {
        res = await fetch(`/api/productos/${formProducto.id}`, {
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
        setMsgFormProducto({ text: data.message || "Error al guardar.", type: "danger" });
        return;
      }

      setMsgFormProducto({ text: "Guardado correctamente.", type: "success" });
      resetFormProducto();
      await cargarProductos();
    } catch (e) {
      console.error(e);
      setMsgFormProducto({ text: "Error al conectar con el servidor.", type: "danger" });
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

  // =========================
  // Handlers para Categorías
  // =========================
  function onChangeCategoria(e) {
    const { name, value } = e.target;
    setFormCategoria((f) => ({ ...f, [name]: value }));
  }

  function startEditarCategoria(cat) {
    setFormCategoria({
      id: cat.id_categoria,
      nombre: cat.nombre || "",
      descripcion: cat.descripcion || ""
    });
    setMsgFormCategoria({ text: "", type: "muted" });
  }

  function resetFormCategoria() {
    setFormCategoria({
      id: "",
      nombre: "",
      descripcion: ""
    });
    setMsgFormCategoria({ text: "", type: "muted" });
  }

  async function onSubmitCategoria(e) {
    e.preventDefault();
    setMsgFormCategoria({ text: "Guardando...", type: "muted" });

    const body = {
      nombre: formCategoria.nombre.trim(),
      descripcion: formCategoria.descripcion.trim()
    };

    if (!body.nombre) {
      setMsgFormCategoria({ text: "El nombre de la categoría es obligatorio.", type: "danger" });
      return;
    }

    try {
      let res;
      if (editModeCategoria) {
        res = await fetch(`/api/categorias/${formCategoria.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/categorias", {
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
        setMsgFormCategoria({ text: data.message || "Error al guardar.", type: "danger" });
        return;
      }

      setMsgFormCategoria({ text: "Categoría guardada correctamente.", type: "success" });
      resetFormCategoria();
      await cargarCategorias();
    } catch (e) {
      console.error(e);
      setMsgFormCategoria({ text: "Error al conectar con el servidor.", type: "danger" });
    }
  }

  async function eliminarCategoria(id) {
    if (!confirm("¿Seguro que deseas eliminar esta categoría? Los productos asociados quedarán sin categoría.")) return;
    try {
      const res = await fetch(`/api/categorias/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "No se pudo eliminar");
        return;
      }
      await cargarCategorias();
      await cargarProductos();
    } catch (e) {
      console.error(e);
      alert("Error al conectar con el servidor.");
    }
  }

  // =========================
  // Render
  // =========================
  return (
    <>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg border-bottom sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-semibold" to="/">🍨 GelatoPro</Link>
          <div className="d-flex flex-wrap gap-2">
            <Link className="btn btn-sm btn-outline-brand" to="/pedido">Caja / Pedido</Link>
            <Link className="btn btn-sm btn-brand" to="/admin">Productos</Link>
            <Link className="btn btn-sm btn-outline-brand" to="/admin/auditoria">Auditoría</Link>
            <Link className="btn btn-sm btn-outline-brand" to="/admin/facturas">Facturas</Link>
            <Link className="btn btn-sm btn-outline-brand" to="/admin/inventario">Inventario</Link>
            <button onClick={logout} className="btn btn-sm btn-outline-secondary">Cerrar sesión</button>
          </div>
        </div>
      </nav>

      <main className="container my-4">
        {/* Encabezado */}
        <section className="hero mb-4 text-center">
          <h1 className="display-6 fw-bold mb-2">Panel administrador</h1>
          <p className="lead mb-0">Gestiona productos y categorías del catálogo.</p>
        </section>

        {/* Tabs de navegación */}
        <div className="card card-soft mb-4">
          <div className="card-body">
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "productos" ? "active" : ""}`}
                  onClick={() => setActiveTab("productos")}
                >
                  Gestión de Productos
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "categorias" ? "active" : ""}`}
                  onClick={() => setActiveTab("categorias")}
                >
                  Gestión de Categorías
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Contenido de Productos */}
        {activeTab === "productos" && (
          <div className="row g-4">
            {/* Formulario Crear/Editar Producto */}
            <div className="col-lg-4">
              <div className="card card-soft h-100">
                <div className="card-body">
                  <h5 className="mb-3">
                    {editModeProducto ? "Editar producto" : "Nuevo producto"}
                  </h5>

                  <form onSubmit={onSubmitProducto}>
                    <input type="hidden" name="id" value={formProducto.id} />

                    <div className="mb-3">
                      <label className="form-label">Nombre del producto</label>
                      <input
                        type="text"
                        className="form-control"
                        name="nombre"
                        value={formProducto.nombre}
                        onChange={onChangeProducto}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Categoría</label>
                      <select
                        className="form-select"
                        name="id_categoria"
                        value={formProducto.id_categoria}
                        onChange={onChangeProducto}
                      >
                        <option value="">Sin categoría</option>
                        {categorias.map((cat) => (
                          <option key={cat.id_categoria} value={cat.id_categoria}>
                            {cat.nombre}
                          </option>
                        ))}
                      </select>
                      <div className="form-text">
                        <button
                          type="button"
                          className="btn btn-sm btn-link p-0"
                          onClick={() => setActiveTab("categorias")}
                        >
                          Gestionar categorías
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Precio base (COP)</label>
                      <input
                        type="number"
                        className="form-control"
                        name="precio"
                        min="0"
                        step="100"
                        value={formProducto.precio}
                        onChange={onChangeProducto}
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
                        value={formProducto.stock}
                        onChange={onChangeProducto}
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
                        value={formProducto.img}
                        onChange={onChangeProducto}
                      />
                      <div className="form-text">
                        Usa una URL de imagen válida o déjalo vacío para imagen por defecto
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">¿Permite toppings?</label>
                      <select
                        className="form-select"
                        name="permiteToppings"
                        value={formProducto.permiteToppings}
                        onChange={onChangeProducto}
                      >
                        <option value="1">Sí</option>
                        <option value="0">No</option>
                      </select>
                    </div>

                    <div className="d-grid gap-2">
                      <button type="submit" className="btn btn-brand">
                        {editModeProducto ? "Actualizar producto" : "Guardar producto"}
                      </button>
                      {editModeProducto && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={resetFormProducto}
                        >
                          Cancelar edición
                        </button>
                      )}
                    </div>

                    {msgFormProducto.text && (
                      <p className={`small mt-3 mb-0 text-${msgFormProducto.type}`}>
                        {msgFormProducto.text}
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
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th className="text-center">Categoría</th>
                          <th className="text-center">Precio</th>
                          <th className="text-center">Stock</th>
                          <th className="text-center">Toppings</th>
                          <th className="text-end">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center text-muted py-4">
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
                                      onError={(e) => {
                                        // Si la imagen falla, mostrar placeholder
                                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0yNCAzMkwyMCAyOEgxNkwxMiAzMkwxNiAzNkgyMEwyNCAzMloiIGZpbGw9IiNENkQ2RDYiLz4KPC9zdmc+';
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
                                        fontSize: 10,
                                        color: "#888",
                                        backgroundColor: '#f8f9fa'
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
                              <td className="text-center">
                                <span className="badge bg-light text-dark">
                                  {p.categoria || "Sin categoría"}
                                </span>
                              </td>
                              <td className="text-center">
                                <span className="fw-bold text-success">
                                  {money(p.precio)}
                                </span>
                              </td>
                              <td className="text-center">
                                <span className={`badge ${
                                  p.stock > 10 ? 'bg-success' : 
                                  p.stock > 0 ? 'bg-warning text-dark' : 'bg-danger'
                                }`}>
                                  {p.stock}
                                </span>
                              </td>
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
                                  onClick={() => startEditarProducto(p)}
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

                  <p className="small text-muted mt-2 mb-0">
                    {msgTabla}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenido de Categorías */}
        {activeTab === "categorias" && (
          <div className="row g-4">
            {/* Formulario Crear/Editar Categoría */}
            <div className="col-lg-4">
              <div className="card card-soft h-100">
                <div className="card-body">
                  <h5 className="mb-3">
                    {editModeCategoria ? "Editar categoría" : "Nueva categoría"}
                  </h5>

                  <form onSubmit={onSubmitCategoria}>
                    <input type="hidden" name="id" value={formCategoria.id} />

                    <div className="mb-3">
                      <label className="form-label">Nombre de la categoría</label>
                      <input
                        type="text"
                        className="form-control"
                        name="nombre"
                        value={formCategoria.nombre}
                        onChange={onChangeCategoria}
                        placeholder="Ej: Helados, Postres, Bebidas..."
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Descripción (opcional)</label>
                      <textarea
                        className="form-control"
                        name="descripcion"
                        rows="3"
                        value={formCategoria.descripcion}
                        onChange={onChangeCategoria}
                        placeholder="Descripción de la categoría..."
                      />
                    </div>

                    <div className="d-grid gap-2">
                      <button type="submit" className="btn btn-brand">
                        {editModeCategoria ? "Actualizar categoría" : "Crear categoría"}
                      </button>
                      {editModeCategoria && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={resetFormCategoria}
                        >
                          Cancelar edición
                        </button>
                      )}
                    </div>

                    {msgFormCategoria.text && (
                      <p className={`small mt-3 mb-0 text-${msgFormCategoria.type}`}>
                        {msgFormCategoria.text}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {/* Lista de categorías */}
            <div className="col-lg-8">
              <div className="card card-soft">
                <div className="card-body">
                  <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Categorías existentes</h5>
                    <small className="text-muted">Organiza tus productos por categorías</small>
                  </div>

                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Descripción</th>
                          <th className="text-center">Productos</th>
                          <th className="text-end">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categorias.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center text-muted py-4">
                              No hay categorías creadas.
                            </td>
                          </tr>
                        ) : (
                          categorias.map((cat) => (
                            <tr key={cat.id_categoria}>
                              <td>
                                <div className="fw-semibold">{cat.nombre}</div>
                              </td>
                              <td>
                                <div className="text-muted small">
                                  {cat.descripcion || "Sin descripción"}
                                </div>
                              </td>
                              <td className="text-center">
                                <span className="badge bg-primary">
                                  {productos.filter(p => p.id_categoria === cat.id_categoria).length}
                                </span>
                              </td>
                              <td className="text-end">
                                <button
                                  className="btn btn-sm btn-outline-brand me-2"
                                  onClick={() => startEditarCategoria(cat)}
                                >
                                  Editar
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => eliminarCategoria(cat.id_categoria)}
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

                  <div className="alert alert-info mt-3">
                    <small>
                      <strong>Nota:</strong> Al eliminar una categoría, los productos asociados
                      quedarán sin categoría pero no se eliminarán.
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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