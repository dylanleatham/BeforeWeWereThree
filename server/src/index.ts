import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import healthRouter from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { envelopesRouter } from './routes/envelopes.js';
import { signalrRouter } from './routes/signalr.js';
import { wyrRouter } from './routes/wyr.js';
import { adminRouter } from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: Express = express();

// Trust first proxy (Azure App Service/Front Door) for correct client IP in rate limiting
app.set('trust proxy', 1);

// Security middleware - configured for React SPA
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

// CORS configuration
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

// Parse JSON bodies and cookies
app.use(express.json());
app.use(cookieParser());

// Mount API routers
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/envelopes', envelopesRouter);
app.use('/api/signalr', signalrRouter);
app.use('/api/wyr', wyrRouter);
app.use('/api/admin', adminRouter);

// Serve static files from client build
// In production bundle, public/ is in the same directory as index.js
const publicPath = join(__dirname, 'public');
app.use(express.static(publicPath));

// SPA fallback - serve index.html for all non-API routes
// Express 5 requires named parameters for wildcards
app.get('/{*splat}', (req, res) => {
  res.sendFile(join(publicPath, 'index.html'));
});

// Global error handler - ensures consistent API response shape for unhandled errors
import type { Request, Response, NextFunction } from 'express';
import { errorResponse } from 'shared';

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json(errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'));
});

// Start server (only when not imported for testing)
const PORT = process.env.PORT ?? 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

// Export for testing
export { app };
