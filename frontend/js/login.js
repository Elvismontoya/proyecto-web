const $ = (sel) => document.querySelector(sel);

// Guarda sesión y redirige
function guardarSesionYEntrar(token, rol) {
  localStorage.setItem('token', token);
  localStorage.setItem('rol', rol);

  if (rol === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'pedido.html';
  }
}

// LOGIN SUBMIT
async function onLoginSubmit(e) {
  e.preventDefault();

  const usuario = $('#inpUsuario').value.trim();
  const password = $('#inpPassword').value.trim();
  const msg = $('#loginMsg');

  if (!usuario || !password) {
    msg.textContent = 'Completa usuario y contraseña.';
    msg.className = 'small text-danger mt-3 mb-0 text-center';
    return;
  }

  msg.textContent = 'Validando...';
  msg.className = 'small text-muted mt-3 mb-0 text-center';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.message || 'Credenciales inválidas.';
      msg.className = 'small text-danger mt-3 mb-0 text-center';
      return;
    }

    msg.textContent = 'Ingreso exitoso.';
    msg.className = 'small text-success mt-3 mb-0 text-center';

    guardarSesionYEntrar(data.token, data.rol);
  } catch (err) {
    console.error(err);
    msg.textContent = 'Error conectando con el servidor.';
    msg.className = 'small text-danger mt-3 mb-0 text-center';
  }
}

// REGISTRO SUBMIT (primer admin)
async function onRegisterSubmit(e) {
  e.preventDefault();

  const nombres = $('#regNombres').value.trim();
  const apellidos = $('#regApellidos').value.trim();
  const usuario = $('#regUsuario').value.trim();
  const password = $('#regPassword').value.trim();
  const msg = $('#registerMsg');

  if (!nombres || !apellidos || !usuario || !password) {
    msg.textContent = 'Todos los campos son obligatorios.';
    msg.className = 'small text-danger mt-3 mb-0 text-center';
    return;
  }

  msg.textContent = 'Creando administrador...';
  msg.className = 'small text-muted mt-3 mb-0 text-center';

  try {
    const res = await fetch('/api/auth/register-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombres, apellidos, usuario, password })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent =
        data.message || 'No se pudo crear el administrador.';
      msg.className = 'small text-danger mt-3 mb-0 text-center';
      return;
    }

    msg.textContent = 'Administrador creado. Ingresando...';
    msg.className = 'small text-success mt-3 mb-0 text-center';

    guardarSesionYEntrar(data.token, data.rol);
  } catch (err) {
    console.error(err);
    msg.textContent = 'Error conectando con el servidor.';
    msg.className = 'small text-danger mt-3 mb-0 text-center';
  }
}

// Mostrar/ocultar tab de Registro según si ya hay admin
async function checkInitialState() {
  // si ya estoy logueado, salto login
  const existingToken = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');
  if (existingToken && rol) {
    if (rol === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'pedido.html';
    }
    return;
  }

  try {
    const res = await fetch('/api/auth/check-initial');
    const data = await res.json();

    const registerTabBtn = $('#register-tab');
    const registerPane = $('#register-pane');

    if (data.needsAdmin === true) {
      // mostrar tab registro admin
      registerTabBtn.classList.remove('d-none');
      registerPane.classList.remove('d-none');
    } else {
      // ocultar completamente la opción de registro
      registerTabBtn.classList.add('d-none');
      registerPane.classList.add('d-none');

      // forzar que login quede activo visualmente
      $('#login-tab').classList.add('active');
      $('#login-pane').classList.add('show', 'active');
      $('#register-tab').classList.remove('active');
      $('#register-pane').classList.remove('show', 'active');
    }
  } catch (err) {
    console.error('Error /check-initial', err);
    // seguridad: si falla, no dejar registrar admin
    $('#register-tab').classList.add('d-none');
    $('#register-pane').classList.add('d-none');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = $('#loginForm');
  const registerForm = $('#registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', onLoginSubmit);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', onRegisterSubmit);
  }

  checkInitialState();
});
