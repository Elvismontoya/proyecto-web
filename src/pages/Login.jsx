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

  // register form
  const [regNombres, setRegNombres] = useState("");
  const [regApellidos, setRegApellidos] = useState("");
  const [regUsuario, setRegUsuario] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [registerMsg, setRegisterMsg] = useState({ text: "", type: "muted" });
  const [registerLoading, setRegisterLoading] = useState(false);

  // si ya hay sesión, redirige
  useEffect(() => {
    const t = getToken();
    const r = localStorage.getItem("rol");
    if (t && r) {
      if (r === "admin") navigate("/admin", { replace: true });
      else navigate("/pedido", { replace: true });
      return;
    }
    // verificar si se necesita crear primer admin
    (async () => {
      try {
        const res = await fetch("/api/auth/check-initial");
        const data = await res.json();
        if (data?.needsAdmin === true) {
          setShowRegister(true);
          setTab("register");
        } else {
          setShowRegister(false);
          setTab("login");
        }
      } catch {
        // por seguridad, si falla: ocultar registro
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
      const res = await fetch(`https://nixgelato-production.up.railway.app/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuario.trim(), password: password.trim() }),
      });
      console.log(res);
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
      const res = await fetch("/api/auth/register-admin", {
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
          <Link className="navbar-brand fw-semibold" to="/">🍨 GelatoPro</Link>
        </div>
      </nav>

      {/* MAIN */}
      <main className="container my-5">
        <section className="hero rounded-xl">
          <div className="row justify-content-center">
            <div className="col-md-6 col-lg-5">
              <div className="card card-soft">
                <div className="card-body">
                  {/* Tabs (controladas por estado, sin JS de Bootstrap) */}
                  <ul className="nav nav-tabs mb-3">
                    <li className="nav-item">
                      <button
                        className={`nav-link ${tab === "login" ? "active" : ""}`}
                        onClick={() => setTab("login")}
                        type="button"
                      >
                        Iniciar sesión
                      </button>
                    </li>
                    {showRegister && (
                      <li className="nav-item">
                        <button
                          className={`nav-link ${tab === "register" ? "active" : ""}`}
                          onClick={() => setTab("register")}
                          type="button"
                        >
                          Registrar administrador
                        </button>
                      </li>
                    )}
                  </ul>

                  {/* Login */}
                  {tab === "login" && (
                    <div>
                      <h4 className="mb-3 text-center">Iniciar sesión</h4>
                      <form onSubmit={onLoginSubmit} id="loginForm">
                        <div className="mb-3">
                          <label className="form-label">Usuario</label>
                          <input
                            type="text"
                            className="form-control"
                            autoComplete="username"
                            value={usuario}
                            onChange={(e) => setUsuario(e.target.value)}
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Contraseña</label>
                          <input
                            type="password"
                            className="form-control"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                        </div>
                        <div className="d-grid">
                          <button type="submit" className="btn btn-brand" disabled={loginLoading}>
                            {loginLoading ? "Ingresando..." : "Entrar"}
                          </button>
                        </div>
                        {loginMsg.text && (
                          <p className={`small mt-3 mb-0 text-center text-${loginMsg.type}`} id="loginMsg">
                            {loginMsg.text}
                          </p>
                        )}
                      </form>
                    </div>
                  )}

                  {/* Registro Admin (solo si hace falta) */}
                  {tab === "register" && showRegister && (
                    <div>
                      <h4 className="mb-3 text-center">Registrar administrador</h4>
                      <div className="alert alert-warning p-2 small text-center">
                        Esta opción solo aparece si aún NO existe un administrador.
                      </div>
                      <form onSubmit={onRegisterSubmit} id="registerForm">
                        <div className="mb-2">
                          <label className="form-label">Nombres</label>
                          <input
                            className="form-control"
                            value={regNombres}
                            onChange={(e) => setRegNombres(e.target.value)}
                            required
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label">Apellidos</label>
                          <input
                            className="form-control"
                            value={regApellidos}
                            onChange={(e) => setRegApellidos(e.target.value)}
                            required
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label">Usuario</label>
                          <input
                            className="form-control"
                            autoComplete="username"
                            value={regUsuario}
                            onChange={(e) => setRegUsuario(e.target.value)}
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Contraseña</label>
                          <input
                            type="password"
                            className="form-control"
                            autoComplete="new-password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            required
                          />
                        </div>
                        <div className="d-grid">
                          <button type="submit" className="btn btn-brand" disabled={registerLoading}>
                            {registerLoading ? "Creando..." : "Crear administrador"}
                          </button>
                        </div>
                        {registerMsg.text && (
                          <p className={`small mt-3 mb-0 text-center text-${registerMsg.type}`} id="registerMsg">
                            {registerMsg.text}
                          </p>
                        )}
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
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