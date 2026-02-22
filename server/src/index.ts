import express, { Express } from 'express';
import { createServer } from 'http';
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
import { mediaRouter } from './routes/media.js';
import { letterRouter } from './routes/letter.js';
import { configRouter } from './routes/config.js';
import { nameGameRouter } from './routes/nameGame.js';
import { friendRouter } from './routes/friend.js';
import { triviaRouter } from './routes/trivia.js';
import { genderRevealRouter } from './routes/genderReveal.js';
import { initializeRealtimeService } from './services/realtime.js';
import { disconnectDatabase } from './db/connection.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: Express = express();

// Create HTTP server (needed for Socket.io)
const httpServer = createServer(app);

// Trust first proxy (Azure App Service/Front Door) for correct client IP in rate limiting
app.set('trust proxy', 1);

// Security middleware - configured for React SPA
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: process.env.NODE_ENV === 'development'
          ? ["'self'", "'unsafe-inline'"]
          : ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://bwwtstorage.blob.core.windows.net'],
        mediaSrc: ["'self'", 'blob:', 'https://bwwtstorage.blob.core.windows.net'],
        connectSrc: ["'self'", frontendUrl, 'wss:', 'ws:', 'https://bwwtstorage.blob.core.windows.net'],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

// Parse JSON bodies and cookies (limit body size to prevent DoS)
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Mount API routers
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/envelopes', envelopesRouter);
app.use('/api/signalr', signalrRouter);
app.use('/api/wyr', wyrRouter);
app.use('/api/admin', adminRouter);
app.use('/api/media', mediaRouter);
app.use('/api/letters', letterRouter);
app.use('/api/config', configRouter);
app.use('/api/name-game', nameGameRouter);
app.use('/api/friends', friendRouter);
app.use('/api/trivia', triviaRouter);
app.use('/api/gender-reveal', genderRevealRouter);

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
  logger.error('Unhandled error', { error: err });
  res.status(500).json(errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'));
});

// Start server (only when not imported for testing)
const PORT = process.env.PORT ?? 3000;

if (process.env.NODE_ENV !== 'test') {
  // Initialize real-time service (Socket.io or Azure SignalR)
  initializeRealtimeService(httpServer);

  httpServer.listen(PORT, () => {
    logger.info('Server started', { port: PORT });
    logger.info('Health check available', { url: `http://localhost:${PORT}/api/health` });
  });

  // ==========================================================================
  // Graceful Shutdown
  // ==========================================================================

  let isShuttingDown = false;

  async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info('Shutdown signal received', { signal });

    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    try {
      // Disconnect from database
      await disconnectDatabase();
      logger.info('Database disconnected');

      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  }

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught errors — always perform graceful shutdown
  // Per Node.js docs, continuing after uncaughtException leaves the process
  // in an undefined state. Drain connections and exit cleanly.
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception — initiating graceful shutdown', { error });
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });
}

// Export for testing
export { app, httpServer };
