import express from 'express';
import authRoutes from './auth.routes';
import issueRoutes from './issue.routes';
import adminRoutes from './admin.routes';
import agentRoutes from './agent.routes';
import geminiRoutes from './gemini.routes';

const apiRouter = express.Router();

// Mount all modular sub-routers
apiRouter.use('/', authRoutes);
apiRouter.use('/', issueRoutes);
apiRouter.use('/', adminRoutes);
apiRouter.use('/', agentRoutes);
apiRouter.use('/', geminiRoutes);

export default apiRouter;
