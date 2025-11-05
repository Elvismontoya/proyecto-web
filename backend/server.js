import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.js';
import productosRouter from './routes/productos.js';
import facturasRouter from './routes/facturas.js';
import auditoriaRouter from './routes/auditoria.js'; // <- Nuevo
import empleadosRouter from './routes/empleados.js'; // <- Nuevo

dotenv.config();

const app = express();

// Resolver __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas de API
app.use('/api/auth', authRouter);
app.use('/api/productos', productosRouter);
app.use('/api/facturas', facturasRouter);
app.use('/api/auditoria', auditoriaRouter); // <- Nuevo
app.use('/api/empleados', empleadosRouter); // <- Nuevo

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ ok: true, msg: 'API viva 😎' });
});

// Servir frontend estático
app.use(express.static(path.join(__dirname, '../frontend')));

// Páginas HTML
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/admin.html'));
});

app.get('/pedido.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/pedido.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});

// Nuevas páginas
app.get('/admin-auditoria.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/admin-auditoria.html'));
});

app.get('/admin-facturas.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/admin-facturas.html'));
});

// Ruta raíz: redirige al login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// 404 básico
app.use((req, res) => {
  res.status(404).send('Página no encontrada');
});

// Levantar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔐 Login:       http://localhost:${PORT}/login.html`);
  console.log(`🛠️ Admin:       http://localhost:${PORT}/admin.html`);
  console.log(`📊 Auditoría:   http://localhost:${PORT}/admin-auditoria.html`);
  console.log(`🧾 Facturas:    http://localhost:${PORT}/admin-facturas.html`);
  console.log(`🧾 Pedido/Caja: http://localhost:${PORT}/pedido.html`);
});