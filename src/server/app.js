import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { initializeDatabase } from './db/index.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { projectRoutes } from './routes/projects.js';
import { cashFlowRoutes } from './routes/cashFlows.js';
import { siteRoutes } from './routes/sites.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: config.trustProxy,
  });

  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 60,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip || 'anonymous',
  });

  initializeDatabase();

  await app.register(authRoutes);
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(siteRoutes, { prefix: '/api/sites' });
  await app.register(cashFlowRoutes, { prefix: '/api/cash-flows' });

  app.get('/health', async () => ({ ok: true }));
  return app;
}
