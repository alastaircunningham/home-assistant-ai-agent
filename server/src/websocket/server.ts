import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { logger } from '../logger.js';
import { handleWebSocketMessage } from './handlers.js';

let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export interface WsMessage {
  type: string;
  data?: unknown;
}

/**
 * Creates a WebSocket server attached to the given HTTP server,
 * listening on the /api/ws path.
 */
export function createWebSocketServer(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    logger.info(`WebSocket client connected (total: ${clients.size})`);

    ws.on('message', (raw: Buffer | string) => {
      try {
        const text = typeof raw === 'string' ? raw : raw.toString('utf-8');
        const message = JSON.parse(text) as WsMessage;
        handleWebSocketMessage(ws, message);
      } catch (err) {
        logger.error('Failed to parse WebSocket message', {
          error: (err as Error).message,
        });
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      logger.info(`WebSocket client disconnected (total: ${clients.size})`);
    });

    ws.on('error', (err: Error) => {
      logger.error('WebSocket client error', { error: err.message });
      clients.delete(ws);
    });
  });

  logger.info('WebSocket server initialised on /api/ws');
  return wss;
}

/**
 * Broadcast a raw JSON message to all connected clients.
 */
export function broadcast(message: WsMessage): void {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

/**
 * Convenience wrapper: broadcast a typed message with fields spread flat.
 */
export function sendToAll(type: string, data?: Record<string, unknown>): void {
  broadcast({ type, ...data });
}
