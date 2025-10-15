// ==== Utilidades ====
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const money = (n) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });
const uuid = () => (crypto?.randomUUID?.() || 'id-' + Math.random().toString(16).slice(2));

// ==== Catálogo ====
const CATALOGO = {
    productos: [
        {
            id: 'cono', nombre: 'Cono',
            img: 'https://thumbs.dreamstime.com/b/italian-gelato-chocolate-delicious-selective-focus-image-176533633.jpg',
            permiteToppings: true,
            tamanos: [
                { id: 'S', nombre: 'Chico', precio: 6000 },
                { id: 'M', nombre: 'Mediano', precio: 8000 },
                { id: 'L', nombre: 'Grande', precio: 10000 }
            ]
        },
        {
            id: 'banana', nombre: 'Banana Split',
            img: 'https://nortedigital.mx/wp-content/uploads/2022/08/1-10-1.jpg',
            permiteToppings: true,
            tamanos: [{ id: 'U', nombre: 'Único', precio: 14000 }]
        },
        {
            id: 'ensalada', nombre: 'Ensalada de frutas',
            img: 'https://ichkoche.twic.pics/image/8/70178.jpg?twic=v1/quality=80/focus=50px50p/cover=1240x868',
            permiteToppings: false,
            tamanos: [
                { id: 'S', nombre: 'Chica', precio: 9000 },
                { id: 'M', nombre: 'Mediana', precio: 11000 },
                { id: 'L', nombre: 'Grande', precio: 13000 }
            ]
        },
        {
            id: 'limonada', nombre: 'Limonada',
            img: 'https://www.liberocorp.pe/wp-content/uploads/2024/03/LIBERO-02-2024-02.png',
            permiteToppings: false,
            tamanos: [
                { id: 'S', nombre: 'Vaso 12oz', precio: 5000 },
                { id: 'M', nombre: 'Vaso 16oz', precio: 6500 },
                { id: 'L', nombre: 'Vaso 20oz', precio: 8000 }
            ]
        }
    ],
    toppings: [
        { id: 'chips', nombre: 'Chips de chocolate', precio: 1500 },
        { id: 'nueces', nombre: 'Nueces', precio: 2000 },
        { id: 'salsa', nombre: 'Salsa de caramelo', precio: 1500 },
        { id: 'frutas', nombre: 'Fruta extra', precio: 2000 },
    ]
};

// ==== Estado ====
let seleccion = { producto: null, tamano: null, toppings: [] };
let pedido = [];
let ticket = 1001;
let descuentoManual = 0;

// ==== Cálculo de totales desde estado ====
function computeTotals() {
    const subtotal = pedido.reduce((acc, p) => acc + p.precioUnit * p.cant, 0);
    const descuento = Math.min(descuentoManual, subtotal);
    const total = Math.max(0, subtotal - descuento);
    return { subtotal, descuento, total };
}

// ==== Render catálogo ====
function renderProductos() {
    const cont = $('#gridProductos');
    cont.innerHTML = CATALOGO.productos.map(p => `
    <div class="col-6 col-md-3">
      <div class="card h-100 card-soft">
        <img src="${p.img}" class="card-img-top" alt="${p.nombre}" style="object-fit:cover;height:120px;">
        <div class="card-body d-flex flex-column">
          <h6 class="card-title">${p.nombre}</h6>
          <button class="btn btn-sm btn-outline-primary mt-auto w-100" data-prod="${p.id}">Elegir</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderTamanos() {
    const cont = $('#gridTamanos');
    cont.innerHTML = '';
    if (!seleccion.producto) return;
    cont.innerHTML = seleccion.producto.tamanos.map(t => `
    <button class="btn btn-outline-primary btn-sm" data-tamano="${t.id}">
      ${t.nombre} <span class="ms-1 badge text-bg-light">${money(t.precio)}</span>
    </button>
  `).join('');
}

function renderToppings() {
    const block = $('#toppingsBlock');
    if (!seleccion.producto || !seleccion.producto.permiteToppings) {
        block.classList.add('d-none');
        return;
    }
    block.classList.remove('d-none');
    const cont = $('#gridToppings');
    cont.innerHTML = CATALOGO.toppings.map(tp => `
    <div class="col-6 col-md-4">
      <div class="card card-soft h-100">
        <div class="card-body d-flex flex-column">
          <h6 class="mb-1">${tp.nombre}</h6>
          <span class="small-muted mb-3">${money(tp.precio)}</span>
          <button class="btn btn-sm btn-outline-primary mt-auto w-100" data-topping="${tp.id}">Añadir</button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateEstado() {
    const estado = [];
    if (seleccion.producto) estado.push(`Producto: ${seleccion.producto.nombre}`);
    if (seleccion.tamano) estado.push(`Tamaño: ${seleccion.tamano.nombre}`);
    if (seleccion.toppings.length) estado.push(`Toppings: ${seleccion.toppings.map(t => t.nombre).join(', ')}`);
    $('#estadoSeleccion').textContent = estado.length ? estado.join(' • ') : 'Sin selección actual.';
    $('#btnAgregarProducto').disabled = !(seleccion.producto && seleccion.tamano);
}

function renderPedido() {
    const tbody = $('#tablaPedido tbody');
    if (!pedido.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Sin items</td></tr>`;
    } else {
        tbody.innerHTML = pedido.map(p => `
      <tr>
        <td>
          <div class="fw-semibold">${p.nombre}</div>
          ${p.toppings.length ? `<div class="small-muted">${p.toppings.map(t => `<span class="topping-badge me-1">${t.nombre}</span>`).join('')}</div>` : ''}
        </td>
        <td class="text-center">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" data-action="dec" data-id="${p.id}">-</button>
            <button class="btn btn-outline-secondary disabled">${p.cant}</button>
            <button class="btn btn-outline-secondary" data-action="inc" data-id="${p.id}">+</button>
          </div>
        </td>
        <td class="text-end">${money(p.precioUnit * p.cant)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" data-action="del" data-id="${p.id}">×</button>
        </td>
      </tr>
    `).join('');
    }

    const { subtotal, descuento, total } = computeTotals();
    $('#subTotal').textContent = money(subtotal);
    $('#discount').textContent = money(descuento);
    $('#total').textContent = money(total);

    recalcCambioYBoton();
}

// ==== Pago (siempre efectivo) ====
function recalcCambioYBoton() {
    const { total } = computeTotals();
    const pago = Number($('#inpPago').value || 0);
    const cambio = Math.max(0, pago - total);
    $('#lblCambio').textContent = money(cambio);

    const hayItems = pedido.length > 0;
    const pagoValido = (pago >= total && total > 0);
    $('#btnCobrar').disabled = !(hayItems && pagoValido);
}

// ==== Eventos ====
function bindEvents() {
    // Producto
    $('#gridProductos').addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-prod');
        if (!id) return;
        seleccion.producto = CATALOGO.productos.find(p => p.id === id);
        seleccion.tamano = null;
        seleccion.toppings = [];
        renderTamanos();
        renderToppings();
        updateEstado();
    });

    // Tamaño
    $('#gridTamanos').addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-tamano');
        if (!id || !seleccion.producto) return;
        seleccion.tamano = seleccion.producto.tamanos.find(t => t.id === id);
        updateEstado();
    });

    // Toppings (toggle)
    $('#gridToppings').addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-topping');
        if (!id) return;
        const i = seleccion.toppings.findIndex(tp => tp.id === id);
        if (i >= 0) seleccion.toppings.splice(i, 1);
        else seleccion.toppings.push(CATALOGO.toppings.find(tp => tp.id === id));
        updateEstado();
    });

    // Limpiar selección
    $('#btnLimpiarConstruccion').addEventListener('click', () => {
        seleccion = { producto: null, tamano: null, toppings: [] };
        renderTamanos();
        renderToppings();
        updateEstado();
    });

    // Agregar item
    $('#btnAgregarProducto').addEventListener('click', () => {
        if (!seleccion.producto || !seleccion.tamano) return;
        const base = seleccion.tamano.precio;
        const extra = (seleccion.producto.permiteToppings)
            ? seleccion.toppings.reduce((acc, t) => acc + t.precio, 0)
            : 0;
        const item = {
            id: uuid(),
            nombre: `${seleccion.producto.nombre} — ${seleccion.tamano.nombre}`,
            toppings: seleccion.producto.permiteToppings ? [...seleccion.toppings] : [],
            precioUnit: base + extra,
            cant: 1
        };
        pedido.push(item);
        // reset selección (mantiene producto)
        seleccion.tamano = null;
        seleccion.toppings = [];
        renderPedido();
        renderTamanos();
        renderToppings();
        updateEstado();
    });

    // Vaciar
    $('#btnVaciar').addEventListener('click', () => {
        pedido = []; descuentoManual = 0; $('#inpDesc').value = 0; $('#inpPago').value = 0;
        renderPedido();
    });

    // Hold
    $('#btnHold').addEventListener('click', () => {
        alert('Pedido puesto en espera (mock).');
    });

    // Descuento
    $('#btnAplicarDesc').addEventListener('click', () => {
        const val = Number($('#inpDesc').value || 0);
        descuentoManual = Math.max(0, val);
        renderPedido();
    });

    // Delegación en tabla
    $('#tablaPedido tbody').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const idx = pedido.findIndex(p => p.id === id);
        if (idx < 0) return;

        if (action === 'inc') pedido[idx].cant++;
        if (action === 'dec') pedido[idx].cant = Math.max(1, pedido[idx].cant - 1);
        if (action === 'del') pedido.splice(idx, 1);

        renderPedido();
    });

    // Pago/cambio (efectivo)
    $('#inpPago').addEventListener('input', recalcCambioYBoton);

    // Cobrar
    $('#btnCobrar').addEventListener('click', realizarPedido);
}

// ==== Confirmar (siempre efectivo) ====
function realizarPedido() {
    const { subtotal, descuento, total } = computeTotals();
    if (total <= 0 || !pedido.length) {
        alert('No hay items en el pedido.');
        return;
    }
    const pago = Number($('#inpPago').value || 0);
    if (pago < total) {
        alert('El pago en efectivo no alcanza el total.');
        return;
    }

    const cambio = Math.max(0, pago - total);

    const payload = {
        ticket,
        fecha: new Date().toISOString(),
        cliente: ($('#inpCliente').value || null),
        metodoPago: 'Efectivo',
        pagoRecibido: pago,
        cambio,
        // nota removida
        items: pedido.map(p => ({
            nombre: p.nombre,
            toppings: p.toppings.map(t => ({ id: t.id, nombre: t.nombre, precio: t.precio })),
            cant: p.cant,
            precioUnit: p.precioUnit,
            subtotal: p.precioUnit * p.cant
        })),
        totales: { subtotal, descuento, total }
    };

    console.info('[Pedido confirmado]', payload);
    alert(`Ticket #${ticket} cobrado en efectivo. Total: ${money(total)}. Cambio: ${money(cambio)}.`);

    // Reset
    ticket++;
    pedido = [];
    descuentoManual = 0;
    $('#inpCliente').value = '';
    $('#inpDesc').value = 0;
    $('#inpPago').value = 0;
    $('#ticketNum').textContent = ticket;
    renderPedido();

    // Limpia selección
    seleccion = { producto: null, tamano: null, toppings: [] };
    renderTamanos();
    renderToppings();
    updateEstado();
}

// ==== Init ====
function init() {
    renderProductos();
    renderTamanos();
    renderToppings();
    bindEvents();
    renderPedido();
    $('#year') && ($('#year').textContent = new Date().getFullYear());
    $('#ticketNum').textContent = ticket;
}
document.addEventListener('DOMContentLoaded', init);
