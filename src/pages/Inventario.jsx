import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const money = (n) =>
    Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

const getToken = () => localStorage.getItem("token") || "";

export default function Inventario() {
    const navigate = useNavigate();

    // Estados
    const [inventario, setInventario] = useState([]);
    const [alertas, setAlertas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [editandoId, setEditandoId] = useState(null);
    const [formEdicion, setFormEdicion] = useState({ stock_actual: "", stock_minimo: "" });

    // Auth check
    useEffect(() => {
        const token = localStorage.getItem("token");
        const rol = localStorage.getItem("rol");
        if (!token) { navigate("/login", { replace: true }); return; }
        if (rol !== "admin") { navigate("/pedido", { replace: true }); return; }
    }, [navigate]);

    // Cargar datos
    async function cargarInventario() {
        setCargando(true);
        try {
            const [resInventario, resAlertas] = await Promise.all([
                fetch("/api/inventario", {
                    headers: { Authorization: `Bearer ${getToken()}` },
                }),
                fetch("/api/inventario/alertas", {
                    headers: { Authorization: `Bearer ${getToken()}` },
                })
            ]);

            if (!resInventario.ok || !resAlertas.ok) {
                throw new Error("Error cargando datos");
            }

            const dataInventario = await resInventario.json();
            const dataAlertas = await resAlertas.json();

            setInventario(Array.isArray(dataInventario) ? dataInventario : []);
            setAlertas(Array.isArray(dataAlertas) ? dataAlertas : []);

        } catch (error) {
            console.error("Error cargando inventario:", error);
            alert("Error cargando el inventario");
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarInventario();
    }, []);

    // Handlers para edición
    function iniciarEdicion(item) {
        setEditandoId(item.id_producto);
        setFormEdicion({
            stock_actual: item.stock_actual.toString(),
            stock_minimo: item.stock_minimo.toString()
        });
    }

    function cancelarEdicion() {
        setEditandoId(null);
        setFormEdicion({ stock_actual: "", stock_minimo: "" });
    }

    async function guardarEdicion(id) {
        if (!formEdicion.stock_actual || !formEdicion.stock_minimo) {
            alert("Todos los campos son obligatorios");
            return;
        }

        try {
            const res = await fetch(`/api/inventario/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    stock_actual: parseInt(formEdicion.stock_actual),
                    stock_minimo: parseInt(formEdicion.stock_minimo)
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            alert("Stock actualizado correctamente");
            cancelarEdicion();
            await cargarInventario();

        } catch (error) {
            console.error("Error actualizando inventario:", error);
            alert("Error al actualizar el stock");
        }
    }

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("rol");
        navigate("/login", { replace: true });
    }

    // Estadísticas
    const estadisticas = {
        totalProductos: inventario.length,
        agotados: inventario.filter(item => item.estado === 'agotado').length,
        bajos: inventario.filter(item => item.estado === 'bajo').length,
        normales: inventario.filter(item => item.estado === 'normal').length
    };

    if (cargando) {
        return (
            <>
                <Navbar logout={logout} />
                <main className="container my-4">
                    <div className="text-center py-5">
                        <div className="spinner-border text-brand" role="status">
                            <span className="visually-hidden">Cargando...</span>
                        </div>
                        <p className="mt-3">Cargando inventario...</p>
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
                    <h1 className="display-6 fw-bold mb-2">Gestión de Inventario</h1>
                    <p className="lead mb-0">Control y seguimiento de stock de productos</p>
                </section>

                {/* Alertas críticas */}
                {alertas.length > 0 && (
                    <div className="card card-soft border-warning mb-4">
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <h5 className="text-warning mb-2">
                                        ⚠️ Alertas de Stock Bajo
                                    </h5>
                                    <p className="mb-0">
                                        {alertas.length} producto(s) tienen stock por debajo del mínimo establecido
                                    </p>
                                </div>
                                <span className="badge bg-warning text-dark fs-6">
                                    {alertas.length}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Estadísticas */}
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="card card-soft">
                            <div className="card-body text-center">
                                <h3 className="text-primary">{estadisticas.totalProductos}</h3>
                                <p className="mb-0 small">Total Productos</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card card-soft">
                            <div className="card-body text-center">
                                <h3 className="text-success">{estadisticas.normales}</h3>
                                <p className="mb-0 small">Stock Normal</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card card-soft">
                            <div className="card-body text-center">
                                <h3 className="text-warning">{estadisticas.bajos}</h3>
                                <p className="mb-0 small">Stock Bajo</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card card-soft">
                            <div className="card-body text-center">
                                <h3 className="text-danger">{estadisticas.agotados}</h3>
                                <p className="mb-0 small">Agotados</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabla de inventario */}
                <div className="card card-soft">
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">Inventario Completo</h5>
                            <button
                                className="btn btn-sm btn-outline-brand"
                                onClick={cargarInventario}
                            >
                                Actualizar
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className="table align-middle">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th className="text-center">Categoría</th>
                                        <th className="text-center">Precio</th>
                                        <th className="text-center">Stock Actual</th>
                                        <th className="text-center">Stock Mínimo</th>
                                        <th className="text-center">Estado</th>
                                        <th className="text-center">Última Actualización</th>
                                        <th className="text-end">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventario.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center text-muted py-4">
                                                No hay productos en el inventario
                                            </td>
                                        </tr>
                                    ) : (
                                        inventario.map((item) => (
                                            <tr key={item.id_producto} className={item.estado === 'agotado' ? 'table-danger' : item.estado === 'bajo' ? 'table-warning' : ''}>
                                                <td>
                                                    <div className="d-flex align-items-center gap-2">
                                                        {item.img ? (
                                                            <img
                                                                src={item.img}
                                                                alt={item.nombre_producto}
                                                                style={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    objectFit: "cover",
                                                                    borderRadius: 6,
                                                                    border: "1px solid #ddd",
                                                                }}
                                                            />
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    borderRadius: 6,
                                                                    border: "1px dashed #ddd",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    fontSize: 10,
                                                                    color: "#888",
                                                                }}
                                                            >
                                                                sin img
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="fw-semibold">{item.nombre_producto}</div>
                                                            <div className="small text-muted">ID: {item.id_producto}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    <span className="badge bg-light text-dark">
                                                        {item.categoria}
                                                    </span>
                                                </td>
                                                <td className="text-center">{money(item.precio)}</td>

                                                {/* Stock Actual - Editable */}
                                                <td className="text-center">
                                                    {editandoId === item.id_producto ? (
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm text-center"
                                                            value={formEdicion.stock_actual}
                                                            onChange={(e) => setFormEdicion(prev => ({
                                                                ...prev,
                                                                stock_actual: e.target.value
                                                            }))}
                                                            min="0"
                                                        />
                                                    ) : (
                                                        <span className={item.stock_actual <= 0 ? "text-danger fw-bold" : ""}>
                                                            {item.stock_actual}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Stock Mínimo - Editable */}
                                                <td className="text-center">
                                                    {editandoId === item.id_producto ? (
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm text-center"
                                                            value={formEdicion.stock_minimo}
                                                            onChange={(e) => setFormEdicion(prev => ({
                                                                ...prev,
                                                                stock_minimo: e.target.value
                                                            }))}
                                                            min="0"
                                                        />
                                                    ) : (
                                                        item.stock_minimo
                                                    )}
                                                </td>

                                                <td className="text-center">
                                                    {item.estado === 'agotado' && (
                                                        <span className="badge bg-danger">Agotado</span>
                                                    )}
                                                    {item.estado === 'bajo' && (
                                                        <span className="badge bg-warning text-dark">Stock Bajo</span>
                                                    )}
                                                    {item.estado === 'normal' && (
                                                        <span className="badge bg-success">Normal</span>
                                                    )}
                                                </td>

                                                <td className="text-center small">
                                                    {item.ultima_actualizacion ?
                                                        new Date(item.ultima_actualizacion).toLocaleDateString('es-CO') :
                                                        'Nunca'
                                                    }
                                                </td>

                                                <td className="text-end">
                                                    {editandoId === item.id_producto ? (
                                                        <div className="d-flex gap-1 justify-content-end">
                                                            <button
                                                                className="btn btn-sm btn-success"
                                                                onClick={() => guardarEdicion(item.id_producto)}
                                                            >
                                                                
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-outline-secondary"
                                                                onClick={cancelarEdicion}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="btn btn-sm btn-outline-brand"
                                                            onClick={() => iniciarEdicion(item)}
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Leyenda de estados */}
                        <div className="mt-3 p-3 border rounded bg-light">
                            <h6 className="mb-2">Leyenda de Estados:</h6>
                            <div className="d-flex gap-3 flex-wrap">
                                <div className="d-flex align-items-center gap-1">
                                    <div className="bg-success rounded" style={{ width: 12, height: 12 }}></div>
                                    <small>Normal: Stock mayor al mínimo</small>
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                    <div className="bg-warning rounded" style={{ width: 12, height: 12 }}></div>
                                    <small>Bajo: Stock igual o menor al mínimo</small>
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                    <div className="bg-danger rounded" style={{ width: 12, height: 12 }}></div>
                                    <small>Agotado: Sin stock disponible</small>
                                </div>
                            </div>
                        </div>
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
                <Link className="navbar-brand fw-semibold" to="/">🍨 GelatoPro</Link>
                <div className="d-flex flex-wrap gap-2">
                    <Link className="btn btn-sm btn-outline-brand" to="/pedido">Caja / Pedido</Link>
                    <Link className="btn btn-sm btn-outline-brand" to="/admin">Productos</Link>
                    <Link className="btn btn-sm btn-outline-brand" to="/admin/auditoria">Auditoría</Link>
                    <Link className="btn btn-sm btn-outline-brand" to="/admin/facturas">Facturas</Link>
                    <Link className="btn btn-sm btn-brand" to="/admin/inventario">Inventario</Link>
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
                <Link to="/">&copy; GelatoPro</Link>
                <p className="mb-0">Desarrollado por Elvis Montoya y Juan Hernandez</p>
                <div className="d-flex gap-4">
                    <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a>
                    <a href="https://www.facebook.com/" target="_blank" rel="noreferrer">Facebook</a>
                </div>
            </div>
        </footer>
    );
}