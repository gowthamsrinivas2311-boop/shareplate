import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { CLIENT_ORIGIN, NODE_ENV } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Trust proxy for reverse proxies and rate limiting
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true
  })
);

// Morgan HTTP request logging in development
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Request body parser with 50kb limit
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Rate limiter: 100 requests per 15 min window
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
      details: null
    }
  }
});

app.use('/api', limiter);

// Mount main API router
app.use('/api', apiRoutes);

// Catch-all 404 handler
app.use(notFound);

// Global centralized error handler
app.use(errorHandler);

export default app;
