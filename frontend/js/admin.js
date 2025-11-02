const $ = (s) => document.querySelector(s);
const money = (n) =>
  Number(n).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP'
  });

let productos = [];

function getToken() {
  return localStorage.getItem('token') || '';
}

function checkAuth() {
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  if (rol !== 'admin') {
    window.location.href = 'pedido.html';
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('rol');
  window.location.href = 'login.html';
}

// Render tabla
function renderTabla() {
  const tbody = $('#tablaAdminProductos tbody');
  const msgTabla = $('#msgTabla');

  if (!productos.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          No hay productos aún.
        </td>
      </tr>`;
    msgTabla.textContent = 'Sin productos en catálogo.';
    return;
  }

  tbody.innerHTML = productos
    .map(
      (p) => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <img src="${p.img || ''}" alt="${p.nombre}"
            style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid #ddd;">
          <div>
            <div class="fw-semibold">${p.nombre}</div>
            <div class="small text-muted">ID: ${p.id}</div>
          </div>
        </div>
      </td>
      <td class="text-center">${money(p.precio)}</td>
      <td class="text-center">${p.stock}</td>
      <td class="text-center">
        ${
          p.permiteToppings
            ? '<span class="badge text-bg-success">Sí</span>'
            : '<span class="badge text-bg-secondary">No</span>'
        }
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-brand me-2"
          data-edit="${p.id}">Editar</button>
        <button class="btn btn-sm btn-outline-danger"
          data-del="${p.id}">Eliminar</button>
      </td>
    </tr>
  `
    )
    .join('');

  msgTabla.textContent = `Total productos: ${productos.length}`;
}

// Cargar productos del backend
async function cargarProductos() {
  const msgTabla = $('#msgTabla');
  msgTabla.textContent = 'Cargando productos...';

  try {
    const res = await fetch('/api/productos', {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    if (!res.ok) {
      msgTabla.textContent = 'No autorizado o error cargando.';
      return;
    }

    const data = await res.json();
    productos = data;
    renderTabla();
  } catch (err) {
    console.error('Error cargando productos', err);
    msgTabla.textContent = 'Error cargando productos.';
  }
}

// Guardar producto (crear / editar)
async function guardarProducto(e) {
  e.preventDefault();

  const id = $('#prodId').value.trim();
  const body = {
    nombre: $('#prodNombre').value.trim(),
    precio: Number($('#prodPrecio').value),
    stock: Number($('#prodStock').value),
    img: $('#prodImg').value.trim(),
    permiteToppings: $('#prodToppings').value === '1' ? 1 : 0
  };

  const msg = $('#msgForm');
  msg.textContent = 'Guardando...';
  msg.className = 'small text-muted mt-3 mb-0';

  try {
    let res;
    if (id) {
      // UPDATE
      res = await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(body)
      });
    } else {
      // CREATE
      res = await fetch('/api/productos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(body)
      });
    }

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.message || 'Error al guardar.';
      msg.className = 'small text-danger mt-3 mb-0';
      return;
    }

    msg.textContent = 'Guardado correctamente.';
    msg.className = 'small text-success mt-3 mb-0';

    resetForm();
    await cargarProductos();
  } catch (err) {
    console.error(err);
    msg.textContent = 'Error al conectar con el servidor.';
    msg.className = 'small text-danger mt-3 mb-0';
  }
}

// Llenar el form para editar
function startEditar(id) {
  const prod = productos.find((p) => String(p.id) === String(id));
  if (!prod) return;

  $('#formTitle').textContent = 'Editar producto';
  $('#btnGuardar').textContent = 'Actualizar';
  $('#btnCancelarEdicion').classList.remove('d-none');

  $('#prodId').value = prod.id;
  $('#prodNombre').value = prod.nombre;
  $('#prodPrecio').value = prod.precio;
  $('#prodStock').value = prod.stock;
  $('#prodImg').value = prod.img || '';
  $('#prodToppings').value = prod.permiteToppings ? '1' : '0';
}

// Reset formulario
function resetForm() {
  $('#formTitle').textContent = 'Nuevo producto';
  $('#btnGuardar').textContent = 'Guardar producto';
  $('#btnCancelarEdicion').classList.add('d-none');

  $('#prodId').value = '';
  $('#formProducto').reset();

  $('#msgForm').textContent = '';
  $('#msgForm').className = 'small text-muted mt-3 mb-0';
}

// Eliminar producto (soft delete)
async function eliminarProducto(id) {
  const confirmar = confirm(
    '¿Seguro que deseas eliminar este producto?'
  );
  if (!confirmar) return;

  try {
    const res = await fetch(`/api/productos/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'No se pudo eliminar');
      return;
    }

    await cargarProductos();
  } catch (err) {
    console.error(err);
    alert('Error al conectar con el servidor.');
  }
}

// Delegar clicks de tabla
function bindTabla() {
  $('#tablaAdminProductos').addEventListener('click', (e) => {
    const btnEdit = e.target.closest('[data-edit]');
    const btnDel = e.target.closest('[data-del]');

    if (btnEdit) {
      startEditar(btnEdit.getAttribute('data-edit'));
    } else if (btnDel) {
      eliminarProducto(btnDel.getAttribute('data-del'));
    }
  });
}

// Init
function init() {
  checkAuth();
  bindTabla();
  cargarProductos();

  $('#formProducto').addEventListener('submit', guardarProducto);
  $('#btnCancelarEdicion').addEventListener('click', resetForm);
  $('#btnLogout').addEventListener('click', logout);
}

document.addEventListener('DOMContentLoaded', init);
