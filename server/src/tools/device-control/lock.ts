import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z.string().describe('The entity ID of the lock (e.g. lock.front_door)'),
  action: z.enum(['lock', 'unlock']).describe('The action to perform'),
  code: z.string().optional().describe('Lock code if required'),
});

const lockControl: ToolDefinition = {
  name: 'lock_control',
  description:
    'Control locks. Lock or unlock doors. This is a security-sensitive action that requires confirmation.',
  inputSchema,
  category: 'device-control',
  confirmationDefault: 'always_confirm',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, action, code } = input;
      const serviceData: Record<string, any> = {};
      if (code) serviceData.code = code;

      await context.hassClient.callService('lock', action, serviceData, { entity_id });

      return {
        success: true,
        result: `Lock ${entity_id} ${action} executed successfully`,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to control lock: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(lockControl);
