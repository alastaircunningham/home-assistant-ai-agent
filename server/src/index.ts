import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';

import { config } from './config.js';
import { logger } from './logger.js';
import { initDatabase } from './db/database.js';
import { ensureSingletonConversation } from './db/conversations.repo.js';
import { startAgingScheduler } from './services/aging.js';
import { ingressMiddleware, ingressRouter } from './middleware/ingress.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { createWebSocketServer } from './websocket/server.js';

import healthRouter from './routes/health.js';
import chatRouter from './routes/chat.js';
import settingsRouter from './routes/settings.js';
import confirmationsRouter from './routes/confirmations.js';
import configFilesRouter from './routes/config-files.js';

// Register all tools on startup
import './tools/index.js';
import { getAllTools } from './tools/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Initialise database
// ---------------------------------------------------------------------------
initDatabase();
ensureSingletonConversation();
startAgingScheduler();

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

app.use(cors());
app.use(express.json());
app.use(ingressMiddleware);
app.use(authMiddleware);

// Static files — served at both root and behind ingress path
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// API routes
app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/confirmation-policies', confirmationsRouter);
app.use('/api/config-files', configFilesRouter);
app.use('/api/ingress', ingressRouter());

// Serve index.html for any non-API route (SPA support)
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Error handler (must be last)
app.use(errorHandler);

// ---------------------------------------------------------------------------
// HTTP + WebSocket server
// ---------------------------------------------------------------------------
const server = createServer(app);
createWebSocketServer(server);

server.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`);
  logger.info(`Log level: ${config.logLevel}`);
  logger.info(`Data directory: ${config.dataDir}`);
  logger.info(`HA config directory: ${config.haConfigDir}`);
  if (config.supervisorToken) {
    logger.info('Running in Home Assistant add-on mode');
  } else {
    logger.info('Running in development mode (no SUPERVISOR_TOKEN)');
  }
  logger.info(`Registered ${getAllTools().length} tools`);
});
