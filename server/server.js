// server/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth.js';
import productosRouter from './routes/productos.js';
import facturasRouter from './routes/facturas.js';
import auditoriaRouter from './routes/auditoria.js';
import empleadosRouter from './routes/empleados.js';
import tamanosRouter from './routes/tamanos.js';
import toppingsRouter from './routes/toppings.js';
import categoriasRouter from './routes/categorias.js';
import inventarioRouter from './routes/inventario.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API
app.use('/api/auth', authRouter);
app.use('/api/productos', productosRouter);
app.use('/api/facturas', facturasRouter);
app.use('/api/auditoria', auditoriaRouter);
app.use('/api/empleados', empleadosRouter);
app.use('/api/tamanos', tamanosRouter);
app.use('/api/toppings', toppingsRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/inventario', inventarioRouter);

// Healthcheck
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ API en http://localhost:${PORT}`);
});
