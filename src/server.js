// ─── Global Error Handlers ────────────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Gracefully shutdown after logging
  setTimeout(() => process.exit(1), 1000);
});

require('dotenv').config();
const express  = require('express');
const path     = require('path');
const helmet   = require('helmet');
const cors     = require('cors');
const morgan   = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes    = require('./routes/auth.routes');
const adminRoutes   = require('./routes/admin.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes   = require('./routes/order.routes');

const app  = express();
const PORT = Number(process.env.PORT || 3000);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // strict limit on auth endpoints
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});

app.use(globalLimiter);

// ─── Body Parsing ────────────────────────────────────────────────────────────
// Delivery proof uploads are sent as base64 JSON, so allow larger payloads here.
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Timeout ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 second timeout per request
  res.setTimeout(30000);
  next();
});

// ─── Uploads / public assets ───────────────────────────────────────────────────
// Legacy fallback: some older proofs were saved under src/uploads.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'R&G Trading API',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/reviews',  require('./routes/review.routes'));


// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`\n🚀 R&G Trading API running on http://localhost:${port}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔑 Auth:      /api/auth`);
    console.log(`📦 Products:  /api/products`);
    console.log(`🛒 Orders:    /api/orders`);
    console.log(`🛠  Admin:     /api/admin\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = port + 1;
      console.warn(`⚠️ Port ${port} is busy. Retrying on ${fallbackPort}...`);
      server.close(() => startServer(fallbackPort));
    } else {
      console.error('Server startup error:', err);
      process.exit(1);
    }
  });
}

startServer(PORT);

module.exports = app;
