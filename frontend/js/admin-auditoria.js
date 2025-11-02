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

// Cargar ingresos por día
async function cargarIngresosPorDia(fechaDesde = '', fechaHasta = '') {
  const msgIngresos = $('#msgIngresos');
  msgIngresos.textContent = 'Cargando ingresos...';

  try {
    let url = '/api/facturas/ingresos-por-dia';
    if (fechaDesde && fechaHasta) {
      url += `?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (!res.ok) throw new Error('Error cargando ingresos');

    const data = await res.json();
    renderIngresosPorDia(data);
    calcularTotales(data);
  } catch (err) {
    console.error('Error cargando ingresos:', err);
    msgIngresos.textContent = 'Error cargando ingresos.';
  }
}

// Renderizar ingresos por día
function renderIngresosPorDia(ingresos) {
  const tbody = $('#tablaIngresosDia tbody');
  const msgIngresos = $('#msgIngresos');

  if (!ingresos.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No hay datos de ingresos</td></tr>`;
    msgIngresos.textContent = 'Sin datos de ingresos.';
    return;
  }

  tbody.innerHTML = ingresos.map(item => `
    <tr>
      <td>${new Date(item.fecha).toLocaleDateString('es-CO')}</td>
      <td class="text-center">${item.total_ventas}</td>
      <td class="text-end">${money(item.ingresos_totales)}</td>
      <td class="text-end">${money(item.promedio_venta)}</td>
    </tr>
  `).join('');

  msgIngresos.textContent = `Mostrando ${ingresos.length} días`;
}

// Calcular totales
function calcularTotales(ingresos) {
  const totalIngresos = ingresos.reduce((sum, item) => sum + item.ingresos_totales, 0);
  const totalVentas = ingresos.reduce((sum, item) => sum + item.total_ventas, 0);
  const promedioVenta = totalVentas > 0 ? totalIngresos / totalVentas : 0;

  $('#totalIngresos').textContent = money(totalIngresos);
  $('#totalVentas').textContent = totalVentas;
  $('#promedioVenta').textContent = money(promedioVenta);
}

// Cargar auditoría
async function cargarAuditoria() {
  const msgAuditoria = $('#msgAuditoria');
  msgAuditoria.textContent = 'Cargando auditoría...';

  try {
    const res = await fetch('/api/auditoria', {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (!res.ok) throw new Error('Error cargando auditoría');

    const data = await res.json();
    renderAuditoria(data);
  } catch (err) {
    console.error('Error cargando auditoría:', err);
    msgAuditoria.textContent = 'Error cargando auditoría.';
  }
}

// Renderizar auditoría
function renderAuditoria(auditoria) {
  const tbody = $('#tablaAuditoria tbody');
  const msgAuditoria = $('#msgAuditoria');

  if (!auditoria.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No hay registros de auditoría</td></tr>`;
    msgAuditoria.textContent = 'Sin registros de auditoría.';
    return;
  }

  tbody.innerHTML = auditoria.map(item => `
    <tr>
      <td>${new Date(item.fecha_hora).toLocaleString('es-CO')}</td>
      <td>${item.empleado || 'Sistema'}</td>
      <td>${item.accion}</td>
      <td>${item.tabla_afectada || '-'}</td>
      <td>${item.descripcion || '-'}</td>
    </tr>
  `).join('');

  msgAuditoria.textContent = `Mostrando ${auditoria.length} registros`;
}

// Aplicar filtros
function aplicarFiltros() {
  const fechaDesde = $('#fechaDesde').value;
  const fechaHasta = $('#fechaHasta').value;
  
  cargarIngresosPorDia(fechaDesde, fechaHasta);
}

// Init
function init() {
  checkAuth();
  
  // Cargar datos iniciales
  cargarIngresosPorDia();
  cargarAuditoria();

  // Event listeners
  $('#btnFiltrar').addEventListener('click', aplicarFiltros);
  $('#btnLogout').addEventListener('click', logout);

  // Establecer fechas por defecto (últimos 7 días)
  const hoy = new Date();
  const hace7Dias = new Date();
  hace7Dias.setDate(hoy.getDate() - 7);

  $('#fechaDesde').value = hace7Dias.toISOString().split('T')[0];
  $('#fechaHasta').value = hoy.toISOString().split('T')[0];
}

document.addEventListener('DOMContentLoaded', init);