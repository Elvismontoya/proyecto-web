// server/server.js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRouter from './routes/auth.js'
import productosRouter from './routes/productos.js'
import facturasRouter from './routes/facturas.js'
import auditoriaRouter from './routes/auditoria.js'
import empleadosRouter from './routes/empleados.js'
import tamanosRouter from './routes/tamanos.js'
import toppingsRouter from './routes/toppings.js'
import categoriasRouter from './routes/categorias.js'
import inventarioRouter from './routes/inventario.js'

const app = express()

// --- CORS ---
const isProd = process.env.NODE_ENV === 'production'
const allowOrigin = process.env.FRONTEND_ORIGIN // ej: https://tu-app.vercel.app
app.use(cors({
  origin: (origin, cb) => {
    if (!isProd) return cb(null, true) // en dev permite todo
    if (!origin) return cb(null, true) // tools/healthchecks
    if (allowOrigin && origin === allowOrigin) return cb(null, true)
    return cb(new Error('CORS: origin no permitido'))
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}))
app.options('*', (_, res) => res.sendStatus(204))

app.use(express.json())

// --- Rutas API ---
app.use('/api/auth', authRouter)
app.use('/api/productos', productosRouter)
app.use('/api/facturas', facturasRouter)
app.use('/api/auditoria', auditoriaRouter)
app.use('/api/empleados', empleadosRouter)
app.use('/api/tamanos', tamanosRouter)
app.use('/api/toppings', toppingsRouter)
app.use('/api/categorias', categoriasRouter)
app.use('/api/inventario', inventarioRouter)

// Healthcheck
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Manejador de errores (catch-all)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message || err)
  res.status(500).json({ message: 'Error interno del servidor' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API escuchando en puerto ${PORT}`)
})
