const $ = (s) => document.querySelector(s);
const money = (n) => Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP' });

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

let facturas = [];
let empleados = [];

// Cargar facturas
async function cargarFacturas(fechaDesde = '', fechaHasta = '', idEmpleado = '') {
  const msgFacturas = $('#msgFacturas');
  msgFacturas.textContent = 'Cargando facturas...';

  try {
    let url = '/api/facturas';
    const params = new URLSearchParams();
    
    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    if (idEmpleado) params.append('id_empleado', idEmpleado);
    
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (!res.ok) throw new Error('Error cargando facturas');

    const data = await res.json();
    facturas = data;
    renderFacturas();
  } catch (err) {
    console.error('Error cargando facturas:', err);
    msgFacturas.textContent = 'Error cargando facturas.';
  }
}

// Renderizar facturas
function renderFacturas() {
  const tbody = $('#tablaFacturas tbody');
  const msgFacturas = $('#msgFacturas');

  if (!facturas.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No hay facturas registradas</td></tr>`;
    msgFacturas.textContent = 'Sin facturas registradas.';
    return;
  }

  tbody.innerHTML = facturas.map(factura => `
    <tr>
      <td>#${factura.id_factura}</td>
      <td>${new Date(factura.fecha_hora).toLocaleString('es-CO')}</td>
      <td>${factura.empleado_nombres || 'N/A'}</td>
      <td>${factura.observaciones || 'Cliente no registrado'}</td>
      <td class="text-end">${money(factura.total_bruto)}</td>
      <td class="text-end">${money(factura.descuento_total)}</td>
      <td class="text-end fw-semibold">${money(factura.total_neto)}</td>
      <td class="text-end">
      </td>
    </tr>
  `).join('');

  msgFacturas.textContent = `Mostrando ${facturas.length} facturas`;
}

// Cargar empleados para filtro
async function cargarEmpleados() {
  try {
    const res = await fetch('/api/empleados', {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (res.ok) {
      const data = await res.json();
      empleados = data;
      renderFiltroEmpleados();
    }
  } catch (err) {
    console.error('Error cargando empleados:', err);
  }
}

// Renderizar filtro de empleados
function renderFiltroEmpleados() {
  const select = $('#filtroEmpleado');
  
  empleados.forEach(emp => {
    const option = document.createElement('option');
    option.value = emp.id_empleado;
    option.textContent = `${emp.nombres} ${emp.apellidos}`;
    select.appendChild(option);
  });
}

// Ver detalle de factura
async function verDetalleFactura(idFactura) {
  try {
    const res = await fetch(`/api/facturas/${idFactura}/detalle`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (!res.ok) throw new Error('Error cargando detalle');

    const data = await res.json();
    mostrarModalDetalle(data);
  } catch (err) {
    console.error('Error cargando detalle:', err);
    alert('Error al cargar el detalle de la factura');
  }
}

// Mostrar modal de detalle
function mostrarModalDetalle(detalle) {
  $('#modalFacturaId').textContent = detalle.factura.id_factura;
  $('#modalFecha').textContent = new Date(detalle.factura.fecha_hora).toLocaleString('es-CO');
  $('#modalEmpleado').textContent = detalle.factura.empleado_nombres || 'N/A';
  $('#modalCliente').textContent = detalle.factura.observaciones || 'Cliente no registrado';
  $('#modalTotal').textContent = money(detalle.factura.total_neto);

  // Renderizar productos
  const tbody = $('#tablaDetalleProductos tbody');
  tbody.innerHTML = detalle.productos.map(prod => `
    <tr>
      <td>${prod.nombre_producto || `Producto ${prod.id_producto}`}</td>
      <td class="text-center">${prod.cantidad}</td>
      <td class="text-end">${money(prod.precio_unitario_venta)}</td>
      <td class="text-end">${money(prod.subtotal_linea)}</td>
    </tr>
  `).join('');

  const modal = new bootstrap.Modal($('#modalDetalleFactura'));
  modal.show();
}

// Aplicar filtros
function aplicarFiltros() {
  const fechaDesde = $('#fechaDesde').value;
  const fechaHasta = $('#fechaHasta').value;
  const idEmpleado = $('#filtroEmpleado').value;
  
  cargarFacturas(fechaDesde, fechaHasta, idEmpleado);
}

// Delegar eventos
function bindEventos() {
  $('#tablaFacturas').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (btn) verDetalleFactura(btn.getAttribute('data-view'));
  });
}

// Init
function init() {
  checkAuth();
  
  // Cargar datos iniciales
  cargarFacturas();
  cargarEmpleados();
  bindEventos();

  // Event listeners
  $('#btnFiltrar').addEventListener('click', aplicarFiltros);
  $('#btnLogout').addEventListener('click', logout);

  // Establecer fechas por defecto (últimos 30 días)
  const hoy = new Date();
  const hace30Dias = new Date();
  hace30Dias.setDate(hoy.getDate() - 30);

  $('#fechaDesde').value = hace30Dias.toISOString().split('T')[0];
  $('#fechaHasta').value = hoy.toISOString().split('T')[0];
}

document.addEventListener('DOMContentLoaded', init);