import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const getToken = () => localStorage.getItem("token") || "";

function guardarSesionYEntrar(navigate, token, rol) {
  localStorage.setItem("token", token);
  localStorage.setItem("rol", rol);
  if (rol === "admin") navigate("/admin", { replace: true });
  else navigate("/pedido", { replace: true });
}

export default function Login() {
  const navigate = useNavigate();

  // pestañas: "login" | "register"
  const [tab, setTab] = useState("login");
  const [showRegister, setShowRegister] = useState(false);

  // login form
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState({ text: "", type: "muted" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // register form
  const [regNombres, setRegNombres] = useState("");
  const [regApellidos, setRegApellidos] = useState("");
  const [regUsuario, setRegUsuario] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [registerMsg, setRegisterMsg] = useState({ text: "", type: "muted" });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);

  // si ya hay sesión, redirige
  useEffect(() => {
    const t = getToken();
    const r = localStorage.getItem("rol");
    if (t && r) {
      if (r === "admin") navigate("/admin", { replace: true });
      else navigate("/pedido", { replace: true });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/check-initial`);
        const data = await res.json();
        if (data?.needsAdmin === true) {
          setShowRegister(true);
          setTab("register");
        } else {
          setShowRegister(false);
          setTab("login");
        }
      } catch {
        setShowRegister(false);
        setTab("login");
      }
    })();
  }, [navigate]);

  async function onLoginSubmit(e) {
    e.preventDefault();
    if (!usuario.trim() || !password.trim()) {
      setLoginMsg({ text: "Completa usuario y contraseña.", type: "danger" });
      return;
    }
    setLoginMsg({ text: "Validando...", type: "muted" });
    setLoginLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuario.trim(), password: password.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginMsg({ text: data.message || "Credenciales inválidas.", type: "danger" });
        return;
      }
      setLoginMsg({ text: "Ingreso exitoso.", type: "success" });
      guardarSesionYEntrar(navigate, data.token, data.rol);
    } catch {
      setLoginMsg({ text: "Error conectando con el servidor.", type: "danger" });
    } finally {
      setLoginLoading(false);
    }
  }

  async function onRegisterSubmit(e) {
    e.preventDefault();
    if (!regNombres.trim() || !regApellidos.trim() || !regUsuario.trim() || !regPassword.trim()) {
      setRegisterMsg({ text: "Todos los campos son obligatorios.", type: "danger" });
      return;
    }
    setRegisterMsg({ text: "Creando administrador...", type: "muted" });
    setRegisterLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombres: regNombres.trim(),
          apellidos: regApellidos.trim(),
          usuario: regUsuario.trim(),
          password: regPassword.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRegisterMsg({ text: data.message || "No se pudo crear el administrador.", type: "danger" });
        return;
      }
      setRegisterMsg({ text: "Administrador creado. Ingresando...", type: "success" });
      guardarSesionYEntrar(navigate, data.token, data.rol);
    } catch {
      setRegisterMsg({ text: "Error conectando con el servidor.", type: "danger" });
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <>
      {/* NAV */}
      <nav className="navbar navbar-expand-lg border-bottom sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-bold fs-3" to="/">
            <span className="text-gradient">🍨 NixGelato</span>
          </Link>
        </div>
      </nav>

      {/* MAIN */}
      <main className="container my-5">
        <section className="rounded-xl fade-in">
          <div className="row g-5 align-items-center justify-content-center">
            {/* Ilustración / lado izquierdo */}
            <div className="col-12 col-lg-6">
              <div className="card card-soft glass-effect border-0" style={{ minHeight: 420 }}>
                <div className="card-body d-flex flex-column justify-content-center p-5">
                  <div className="text-center mb-4">
                    <div className="display-1 mb-3">🍨</div>
                    <h1 className="display-5 fw-bold mb-3">
                      Bienvenido a <span className="text-gradient">NixGelato</span>
                    </h1>
                    <p className="lead text-muted mb-4">
                      Sistema de gestión para heladería. Controla productos, pedidos y facturas con una interfaz moderna y segura.
                    </p>
                  </div>
                  
                  <div className="row text-center">
                    <div className="col-md-4 mb-3">
                      <div className="p-3 rounded-lg hover-lift">
                        <div className="fs-2 mb-2">⚡</div>
                        <h6 className="fw-semibold mb-1">Rápido</h6>
                        <small className="text-muted">Interfaz optimizada</small>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="p-3 rounded-lg hover-lift">
                        <div className="fs-2 mb-2">🔒</div>
                        <h6 className="fw-semibold mb-1">Seguro</h6>
                        <small className="text-muted">Autenticación JWT</small>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="p-3 rounded-lg hover-lift">
                        <div className="fs-2 mb-2">📊</div>
                        <h6 className="fw-semibold mb-1">En tiempo real</h6>
                        <small className="text-muted">Estadísticas actualizadas</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta de autenticación */}
            <div className="col-12 col-lg-5">
              <div className="card card-soft border-0 shadow-lg">
                <div className="card-body p-4 p-md-5">
                  {/* Header elegante */}
                  <div className="text-center mb-4">
                    <div className="bg-gradient-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                         style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, var(--sky) 0%, var(--aqua) 100%)' }}>
                      <span className="fs-4">🔐</span>
                    </div>
                    <h3 className="fw-bold mb-1">Iniciar Sesión</h3>
                    <p className="text-muted">Accede a tu cuenta</p>
                  </div>

                  {/* Tabs minimalistas */}
                  <div className="mb-4">
                    <div className="d-flex bg-light rounded-lg p-1">
                      <button
                        type="button"
                        className={`btn flex-fill ${tab === "login" ? "btn-brand shadow-sm" : "btn-outline-brand border-0"}`}
                        style={{ borderRadius: "0.5rem", padding: "0.75rem" }}
                        onClick={() => setTab("login")}
                      >
                        Iniciar sesión
                      </button>
                      {showRegister && (
                        <button
                          type="button"
                          className={`btn flex-fill ms-1 ${tab === "register" ? "btn-brand shadow-sm" : "btn-outline-brand border-0"}`}
                          style={{ borderRadius: "0.5rem", padding: "0.75rem" }}
                          onClick={() => setTab("register")}
                        >
                          Registrar admin
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Login */}
                  {tab === "login" && (
                    <form onSubmit={onLoginSubmit} className="space-y-3">
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Usuario</label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            👤
                          </span>
                          <input
                            type="text"
                            className="form-control border-start-0 ps-1"
                            placeholder="Ingresa tu usuario"
                            autoComplete="username"
                            value={usuario}
                            onChange={(e) => setUsuario(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Contraseña</label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            {showPass ? "🙈" : "🔒"}
                          </span>
                          <input
                            type={showPass ? "text" : "password"}
                            className="form-control border-start-0 ps-1"
                            placeholder="Ingresa tu contraseña"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-outline-brand border-start-0"
                            onClick={() => setShowPass((v) => !v)}
                            aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showPass ? "Ocultar" : "Mostrar"}
                          </button>
                        </div>
                        <div className="form-text text-end">¿Olvidaste tu contraseña?</div>
                      </div>

                      <div className="d-grid">
                        <button 
                          type="submit" 
                          className="btn btn-brand btn-lg fw-semibold py-3"
                          disabled={loginLoading}
                        >
                          {loginLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" />
                              Ingresando...
                            </>
                          ) : (
                            "Entrar al sistema"
                          )}
                        </button>
                      </div>

                      {loginMsg.text && (
                        <div className={`alert alert-dismissible fade show mt-3 alert-${loginMsg.type === "danger" ? "danger" : loginMsg.type === "success" ? "success" : "secondary"}`} role="alert">
                          {loginMsg.text}
                          <button type="button" className="btn-close" onClick={() => setLoginMsg({ text: "", type: "muted" })}></button>
                        </div>
                      )}
                    </form>
                  )}

                  {/* Registro Admin */}
                  {tab === "register" && showRegister && (
                    <form onSubmit={onRegisterSubmit} className="space-y-3">
                      <div className="alert alert-warning text-center mb-4">
                        <strong>Configuración inicial</strong>
                        <br />
                        <small>Creando el primer administrador del sistema</small>
                      </div>
                      
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">Nombres</label>
                          <input
                            className="form-control form-control-lg"
                            placeholder="Nombres"
                            value={regNombres}
                            onChange={(e) => setRegNombres(e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">Apellidos</label>
                          <input
                            className="form-control form-control-lg"
                            placeholder="Apellidos"
                            value={regApellidos}
                            onChange={(e) => setRegApellidos(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Usuario</label>
                        <input
                          className="form-control form-control-lg"
                          placeholder="Nombre de usuario"
                          autoComplete="username"
                          value={regUsuario}
                          onChange={(e) => setRegUsuario(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Contraseña</label>
                        <div className="input-group input-group-lg">
                          <input
                            type={showRegPass ? "text" : "password"}
                            className="form-control"
                            placeholder="Contraseña segura"
                            autoComplete="new-password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-outline-brand"
                            onClick={() => setShowRegPass((v) => !v)}
                          >
                            {showRegPass ? "Ocultar" : "Mostrar"}
                          </button>
                        </div>
                      </div>
                      
                      <div className="d-grid">
                        <button 
                          type="submit" 
                          className="btn btn-brand btn-lg fw-semibold py-3"
                          disabled={registerLoading}
                        >
                          {registerLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" />
                              Creando...
                            </>
                          ) : (
                            "Crear cuenta de administrador"
                          )}
                        </button>
                      </div>
                      
                      {registerMsg.text && (
                        <div className={`alert alert-dismissible fade show mt-3 alert-${registerMsg.type === "danger" ? "danger" : registerMsg.type === "success" ? "success" : "secondary"}`} role="alert">
                          {registerMsg.text}
                          <button type="button" className="btn-close" onClick={() => setRegisterMsg({ text: "", type: "muted" })}></button>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>

              {/* Información adicional */}
              <div className="text-center mt-4">
                <small className="text-muted">
                  ¿Problemas para acceder?{" "}
                  <a href="#" className="text-decoration-none fw-semibold text-gradient">Contactar soporte</a>
                </small>
              </div>
            </div>
          </div>
        </section>
      </main>

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