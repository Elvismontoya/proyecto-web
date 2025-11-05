// ==============================
//  Utilidades
// ==============================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const money = (n) =>
  Number(n).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP'
  });

// ==============================
//  Variables globales
// ==============================
let productos = [];
let pedido = []; // cada item: { id, nombre, precio, cantidad }
let descuento = 0;

// ==============================
//  Sesión / Seguridad
// ==============================
function getToken() {
  return localStorage.getItem('token') || '';
}

function getRol() {
  return localStorage.getItem('rol') || '';
}

function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
  }
}

// ==============================
//  Cargar productos desde backend
// ==============================
async function cargarProductos() {
  const grid = $('#gridProductos');
  grid.innerHTML = `<div class="text-center py-3 text-muted">Cargando productos...</div>`;

  try {
    const res = await fetch('/api/productos', {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      grid.innerHTML = `<div class="text-center text-danger py-3">${data.message || 'Error cargando productos.'
        }</div>`;
      return;
    }

    const data = await res.json();
    productos = data;

    if (!productos.length) {
      grid.innerHTML = `<div class="text-center text-muted py-3">No hay productos disponibles.</div>`;
      return;
    }

    grid.innerHTML = productos
      .map(
        (p) => `
        <div class="col-6 col-md-4 col-xl-3">
          <div class="card card-soft h-100 border-0 shadow-sm">
            <img src="${p.img || ''}" class="card-img-top" alt="${p.nombre}" style="object-fit:cover;height:110px;border-radius:6px;">
            <div class="card-body p-2 d-flex flex-column">
              <div class="fw-semibold">${p.nombre}</div>
              <div class="small text-muted">${money(p.precio)}</div>
              <div class="small ${p.stock > 0 ? 'text-success' : 'text-danger'}">
                Stock: ${p.stock}
              </div>
              <button class="btn btn-primary btn-sm mt-auto" data-add="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      `
      )
      .join('');
  } catch (err) {
    console.error('Error al cargar productos:', err);
    grid.innerHTML = `<div class="text-center text-danger py-3">Error de conexión.</div>`;
  }
}

// ==============================
//  Pedido (carrito local)
// ==============================
function agregarProducto(id) {
  const prod = productos.find((p) => String(p.id) === String(id));
  if (!prod) return;

  const existente = pedido.find((i) => i.id === prod.id);
  if (existente) {
    if (existente.cantidad + 1 > prod.stock) {
      alert('No hay más stock disponible.');
      return;
    }
    existente.cantidad += 1;
  } else {
    pedido.push({
      id: prod.id,
      nombre: prod.nombre,
      precio: prod.precio,
      cantidad: 1
    });
  }

  renderPedido();
}

function quitarProducto(id) {
  pedido = pedido.filter((i) => i.id !== id);
  renderPedido();
}

function actualizarCantidad(id, nuevaCantidad) {
  nuevaCantidad = Number(nuevaCantidad);
  if (isNaN(nuevaCantidad) || nuevaCantidad < 1) return;

  const item = pedido.find((i) => i.id === id);
  if (!item) return;

  const prod = productos.find((p) => p.id === id);
  if (nuevaCantidad > prod.stock) {
    alert('No hay suficiente stock.');
    return;
  }

  item.cantidad = nuevaCantidad;
  renderPedido();
}

function vaciarPedido() {
  pedido = [];
  renderPedido();
}

function calcularTotales() {
  let subtotal = pedido.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  let total = subtotal - descuento;
  if (total < 0) total = 0;
  return { subtotal, total };
}

function aplicarDescuento() {
  const val = Number($('#inpDesc').value);
  descuento = isNaN(val) || val < 0 ? 0 : val;
  renderPedido();
}

// ==============================
//  Renderizar tabla del pedido
// ==============================
function renderPedido() {
  const tbody = $('#tablaPedido tbody');
  const { subtotal, total } = calcularTotales();

  if (!pedido.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Sin productos</td></tr>`;
  } else {
    tbody.innerHTML = pedido
      .map(
        (i) => `
        <tr>
          <td>${i.nombre}</td>
          <td class="text-center">
            <input type="number" class="form-control form-control-sm text-center" value="${i.cantidad
          }" min="1" style="width:60px" data-cant="${i.id}">
          </td>
          <td class="text-end">${money(i.precio * i.cantidad)}</td>
          <td class="text-end">
            <button class="btn btn-outline-danger btn-sm" data-del="${i.id}">✕</button>
          </td>
        </tr>
      `
      )
      .join('');
  }

  $('#subTotal').textContent = money(subtotal);
  $('#discount').textContent = money(descuento);
  $('#total').textContent = money(total);
  $('#btnCobrar').disabled = pedido.length === 0;

  actualizarCambio();
}

// ==============================
//  Calcular cambio en efectivo
// ==============================
function actualizarCambio() {
  const pago = Number($('#inpPago').value);
  const { total } = calcularTotales();
  const cambio = pago - total;
  $('#lblCambio').textContent = cambio > 0 ? money(cambio) : money(0);
}

// ==============================
//  Cobrar (simulado)
// ==============================
async function cobrar() {
  if (!pedido.length) {
    alert('No hay productos en el pedido');
    return;
  }

  const cliente = $('#inpCliente').value;
  const pago = Number($('#inpPago').value);
  const { subtotal, total } = calcularTotales();

  if (pago < total) {
    alert('El pago es insuficiente.');
    return;
  }

  const payload = {
    cliente,
    subtotal,
    descuento,
    total,
    metodo_pago: 'efectivo',
    productos: pedido
  };

  try {
    const res = await fetch('/api/facturas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    alert('✅ Factura registrada correctamente.');
    vaciarPedido();
    $('#inpPago').value = 0;
    $('#inpCliente').value = '';
    $('#inpDesc').value = 0;
    descuento = 0;
    renderPedido();
  } catch (err) {
    console.error(err);
    alert('❌ Error al registrar factura: ' + err.message);
  }
}

// En app.js - función cargarMetodosPago
function cargarMetodosPago() {
  // Simulación de datos - reemplaza con tu llamada a la API real
  const metodosPago = [
    { id_metodo: 1, nombre_metodo: "Efectivo", description: "Pago en efectivo al momento de la entrega", activo: true },
    { id_metodo: 2, nombre_metodo: "Transferencia", description: "Transferencia bancaria", activo: true }
  ];

  const selectMetodoPago = document.getElementById('metodo_pago');

  // Limpiar opciones existentes
  while (selectMetodoPago.options.length > 0) {
    selectMetodoPago.remove(0);
  }

  // Opción por defecto
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Seleccione un método de pago';
  selectMetodoPago.appendChild(defaultOption);

  // Agregar métodos de pago
  metodosPago.forEach(metodo => {
    if (metodo.activo) {
      const option = document.createElement('option');
      option.value = metodo.nombre_metodo; // Usar el nombre exacto
      option.textContent = metodo.nombre_metodo;
      option.setAttribute('data-description', metodo.description);
      selectMetodoPago.appendChild(option);
    }
  });

  // Agregar evento para mostrar descripción
  selectMetodoPago.addEventListener('change', function () {
    const selectedOption = this.options[this.selectedIndex];
    if (selectedOption.value) {
      const descripcion = selectedOption.getAttribute('data-description');
      mostrarDescripcionMetodoPago(descripcion);
    } else {
      ocultarDescripcionMetodoPago();
    }
  });
}

async function cobrar() {
  if (!pedido.length) {
    alert('No hay productos en el pedido');
    return;
  }

  const cliente = $('#inpCliente').value;
  const pago = Number($('#inpPago').value);
  const metodoPagoSelect = document.getElementById('metodo_pago');
  const metodoPagoSeleccionado = metodoPagoSelect.value;
  
  const { subtotal, total } = calcularTotales();

  // Validar método de pago
  if (!metodoPagoSeleccionado) {
    alert('Por favor, seleccione un método de pago');
    metodoPagoSelect.focus();
    return;
  }

  if (pago < total) {
    alert('El pago es insuficiente.');
    return;
  }

  const payload = {
    cliente,
    subtotal,
    descuento,
    total,
    metodo_pago: metodoPagoSeleccionado,
    productos: pedido.map(p => ({
      id: p.id,
      cantidad: p.cantidad,
      precio: p.precio
    }))
  };

  console.log("Enviando payload:", payload); // Para debugging

  try {
    const res = await fetch('/api/facturas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    alert('✅ Factura registrada correctamente.');
    vaciarPedido();
    $('#inpPago').value = 0;
    $('#inpCliente').value = '';
    $('#inpDesc').value = 0;
    descuento = 0;
    metodoPagoSelect.value = '';
    renderPedido();
  } catch (err) {
    console.error(err);
    alert('❌ Error al registrar factura: ' + err.message);
  }
}
// ==============================
//  Eventos del DOM
// ==============================
function bindEventos() {
  // Agregar producto
  $('#gridProductos').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (btn) agregarProducto(Number(btn.dataset.add));
  });

  // Quitar producto
  $('#tablaPedido').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del]');
    if (btn) quitarProducto(Number(btn.dataset.del));
  });

  // Cambiar cantidad
  $('#tablaPedido').addEventListener('change', (e) => {
    const inp = e.target.closest('[data-cant]');
    if (inp) actualizarCantidad(Number(inp.dataset.cant), inp.value);
  });

  // Vaciar pedido
  $('#btnVaciar').addEventListener('click', vaciarPedido);

  // Aplicar descuento
  $('#btnAplicarDesc').addEventListener('click', aplicarDescuento);

  // Cobrar
  $('#btnCobrar').addEventListener('click', cobrar);

  // Actualizar cambio en tiempo real
  $('#inpPago').addEventListener('input', actualizarCambio);
}

// ==============================
//  Inicialización
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  cargarProductos();
  bindEventos();
  renderPedido();
  cargarMetodosPago();
});
