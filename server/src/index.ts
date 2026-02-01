import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import healthRouter from './routes/health.js';

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json());

// Mount health router
app.use('/api/health', healthRouter);

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
