import { config } from './config.js';
import { createHassClient } from './tools/hass-client.js';
import type { ToolContext, HassClient } from './tools/types.js';

let hassClient: HassClient | null = null;

/**
 * Get or create the shared HassClient instance.
 */
export function getHassClient(): HassClient {
  if (!hassClient) {
    hassClient = createHassClient();
  }
  return hassClient;
}

/**
 * Get the tool context for executing tools.
 */
export function getToolContext(): ToolContext {
  return {
    hassClient: getHassClient(),
    configDir: config.haConfigDir,
  };
}
