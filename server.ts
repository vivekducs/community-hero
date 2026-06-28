import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import authRouter from './server/routes/auth';
import geminiRouter from './server/routes/gemini';
import issuesRouter from './server/routes/issues';
import agentRouter from './server/routes/agent';
import adminRouter from './server/routes/admin';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

async function bootstrap() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Request logger middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // REST API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount modular route handlers
  app.use('/', authRouter);
  app.use('/', geminiRouter);
  app.use('/', issuesRouter);
  app.use('/', agentRouter);
  app.use('/', adminRouter);

  // POST /api/notifications/send-fcm
  app.post(['/notifications/send-fcm', '/api/notifications/send-fcm'], async (req, res) => {
    const { user_id, title, body, icon_url, token } = req.body;
    console.log(`[FCM Mock] Sending push notification to ${user_id || 'unknown'} (token: ${token || 'none'})`);
    console.log(`[FCM Mock] Title: ${title}, Body: ${body}`);
    res.json({ success: true, message: "Push notification queued successfully (mock)" });
  });

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Community Hero Server] Running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failure booting Community Hero platform server:', err);
});
