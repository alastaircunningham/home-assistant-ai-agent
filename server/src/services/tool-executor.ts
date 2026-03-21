import { getTool } from '../tools/index.js';
import { getPolicy, type PolicyLevel } from '../db/confirmations.repo.js';
import type { ToolContext, ToolResult } from '../tools/types.js';
import { logger } from '../logger.js';

/**
 * Execute a tool by name with the given input and context.
 */
export async function executeTool(
  toolName: string,
  toolInput: any,
  context: ToolContext,
): Promise<ToolResult> {
  const tool = getTool(toolName);
  if (!tool) {
    return {
      success: false,
      result: null,
      error: `Unknown tool: ${toolName}`,
    };
  }

  try {
    logger.info(`Executing tool: ${toolName}`, { input: toolInput });
    const result = await tool.execute(toolInput, context);
    logger.info(`Tool ${toolName} completed`, { success: result.success });
    return result;
  } catch (err) {
    logger.error(`Tool ${toolName} threw an error`, { error: (err as Error).message });
    return {
      success: false,
      result: null,
      error: `Tool execution error: ${(err as Error).message}`,
    };
  }
}

/**
 * Check the confirmation policy for a tool.
 * Returns the policy from DB, falling back to the tool's default.
 */
export function checkConfirmation(toolName: string): PolicyLevel {
  // config_editor always requires confirmation, cannot be overridden
  if (toolName === 'config_editor') {
    return 'always_confirm';
  }

  const dbPolicy = getPolicy(toolName);
  if (dbPolicy) {
    return dbPolicy;
  }

  // Fall back to tool's default
  const tool = getTool(toolName);
  return tool?.confirmationDefault ?? 'always_confirm';
}
