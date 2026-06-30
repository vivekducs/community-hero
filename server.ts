import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';

import apiRouter from './server/routes/index';
import { requestLogger } from './server/middleware/logger.middleware';
import { errorHandler } from './server/middleware/error.middleware';
import { customRateLimiter, inputSanitizer, requestSizeValidator } from './server/middleware/security.middleware';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

async function bootstrap() {
  const app = express();
  
  // Security configuration: Helmet & CORS
  app.use(helmet({
    contentSecurityPolicy: false, // Turn off CSP so that local iframe/Vite HMR/Google fonts load cleanly in AI Studio
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
  }));
  app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Limit request sizes to prevent denial of service (DoS)
  app.use(requestSizeValidator(50 * 1024 * 1024)); // 50MB
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Sanitize all incoming parameters against basic XSS vectors
  app.use(inputSanitizer);

  // Apply a dynamic lightweight in-memory rate limiter to public API endpoints
  app.use('/api', customRateLimiter(200, 60 * 1000)); // 200 requests/minute limit per IP

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Firebase Auth custom domain proxy to prevent third-party cookie/storage partitioning issues on custom domains/Cloud Run
  app.all('/__/auth/*', async (req, res) => {
    const targetUrl = `https://tranquil-atom-8gbcx.firebaseapp.com${req.originalUrl}`;
    console.log(`📡 [Proxy Debug] Proxying ${req.method} request to Firebase Auth: ${req.originalUrl}`);
    try {
      const headers: any = {};
      Object.entries(req.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
          headers[key] = value;
        }
      });
      headers['host'] = 'tranquil-atom-8gbcx.firebaseapp.com';

      let data: any = req.body;
      if (req.method !== 'GET' && req.body && typeof req.body === 'object') {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/x-www-form-urlencoded')) {
          data = new URLSearchParams(req.body).toString();
        } else if (contentType.includes('application/json')) {
          data = JSON.stringify(req.body);
        }
      }

      const response = await axios({
        method: req.method,
        url: targetUrl,
        headers,
        data,
        responseType: 'stream',
        validateStatus: () => true,
      });

      console.log(`📡 [Proxy Debug] Firebase Auth responded with status ${response.status} for ${req.originalUrl}`);

      Object.entries(response.headers).forEach(([key, value]) => {
        if (value !== undefined) {
          res.setHeader(key, value);
        }
      });

      // Explicitly enforce same-origin-allow-popups to ensure popup communication is never blocked
      res.setHeader('cross-origin-opener-policy', 'same-origin-allow-popups');

      res.status(response.status);
      response.data.pipe(res);
    } catch (error: any) {
      console.error('❌ [Proxy Debug] Error proxying Firebase Auth request:', error);
      res.status(500).send('Authentication proxy error');
    }
  });

  // 1. Centralized logging middleware
  app.use(requestLogger);

  // REST API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 2. Mount unified modular routes
  app.use('/', apiRouter);

  // Integrate Vite dev server middleware in development
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 3. Centralized error handling middleware
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Community Hero Server] Running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failure booting Community Hero platform server:', err);
});
