// server/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth.js';
import productosRouter from './routes/productos.js';
import facturasRouter from './routes/facturas.js';
import auditoriaRouter from './routes/auditoria.js';
import empleadosRouter from './routes/empleados.js';

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

// Healthcheck
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Nada de servir .html en dev (lo hace Vite en :5173)
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ API en http://localhost:${PORT}`);
});
