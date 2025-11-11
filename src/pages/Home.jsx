import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg border-bottom sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-semibold" to="/">🍨 NixGelato</Link>
          <Link className="btn btn-sm btn-brand ms-lg-3" to="/login">Iniciar sesión</Link>
        </div>
      </nav>

      {/* Main */}
      <main className="container my-5">
        <section className="hero text-center">
          <h1 className="display-5 fw-bold mb-3">
            ¡Bienvenido a <span className="text-primary">NixGelato</span>!
          </h1>
          <p className="lead mb-4">
            Administra fácilmente los pedidos de tu heladería con una interfaz moderna, rápida y adaptable.
            Controla tamaños, sabores y toppings en segundos.
          </p>
          <Link to="/login" className="btn btn-brand btn-lg">Comenzar ahora</Link>
        </section>

        <section className="mt-5">
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="card card-soft h-100">
                <div className="card-body">
                  <h5 className="card-title mb-3">¿Qué es NixGelato?</h5>
                  <p>
                    Es una aplicación diseñada para gestionar los procesos de venta en heladerías.
                    Permite tomar pedidos, calcular totales automáticamente y simplificar el flujo de trabajo del cajero.
                  </p>
                  <ul>
                    <li>Agrega productos y toppings con un clic.</li>
                    <li>Aplica descuentos.</li>
                    <li>Obtén un resumen del pedido antes de cobrar.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card card-soft h-100">
                <div className="card-body">
                  <h5 className="card-title mb-3">Escalable a futuro</h5>
                  <p>Esta versión está pensada para crecer con tu negocio:</p>
                  <ul>
                    <li>Integración con inventario y control de stock.</li>
                    <li>Reportes automáticos de ventas y cierres de caja.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-4 border-top">
        <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <Link to="/">&copy; NixGelato</Link>
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