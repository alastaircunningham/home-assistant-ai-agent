import type { WebSocket } from 'ws';
import { logger } from '../logger.js';
import type { WsMessage } from './server.js';
import { sendToAll } from './server.js';
import { handleMessage, resumeAfterConfirmation } from '../services/chat.js';
import { SINGLETON_ID } from '../db/conversations.repo.js';
import { getToolContext } from '../tool-context.js';

/**
 * Route incoming WebSocket messages by type.
 */
export function handleWebSocketMessage(ws: WebSocket, message: WsMessage): void {
  const { type, data } = message;
  logger.info(`WebSocket message received: ${type}`, { data });

  switch (type) {
    case 'send_message':
      handleSendMessage(ws, data as { content: string });
      break;

    case 'confirmation_response':
      handleConfirmationResponse(
        ws,
        message as unknown as { id: string; approved: boolean },
      );
      break;

    default:
      logger.warn(`Unknown WebSocket message type: ${type}`);
      ws.send(JSON.stringify({ type: 'error', data: { message: `Unknown type: ${type}` } }));
      break;
  }
}

/**
 * Handle a send_message WebSocket request.
 */
function handleSendMessage(ws: WebSocket, data: { content: string }): void {
  const { content } = data ?? {};

  if (!content) {
    ws.send(
      JSON.stringify({
        type: 'error',
        data: { message: 'content is required' },
      }),
    );
    return;
  }

  const toolContext = getToolContext();

  handleMessage(SINGLETON_ID, content, sendToAll, toolContext).catch((err) => {
    logger.error('Failed to handle WebSocket message', { error: (err as Error).message });
    ws.send(
      JSON.stringify({
        type: 'error',
        data: { message: (err as Error).message },
      }),
    );
  });
}

/**
 * Handle a confirmation_response WebSocket message.
 */
function handleConfirmationResponse(
  ws: WebSocket,
  data: { id: string; approved: boolean },
): void {
  const { id: confirmationId, approved } = data ?? {};

  if (!confirmationId || typeof approved !== 'boolean') {
    ws.send(
      JSON.stringify({
        type: 'error',
        data: { message: 'confirmationId and approved (boolean) are required' },
      }),
    );
    return;
  }

  const toolContext = getToolContext();

  resumeAfterConfirmation(confirmationId, approved, sendToAll, toolContext).catch((err) => {
    logger.error('Failed to handle confirmation response', {
      error: (err as Error).message,
      confirmationId,
    });
    ws.send(
      JSON.stringify({
        type: 'error',
        data: { confirmationId, message: (err as Error).message },
      }),
    );
  });
}
