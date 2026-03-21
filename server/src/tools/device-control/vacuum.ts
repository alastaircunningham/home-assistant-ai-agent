import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z.string().describe('The entity ID of the vacuum (e.g. vacuum.roborock)'),
  action: z
    .enum(['start', 'stop', 'pause', 'return_to_base', 'locate'])
    .describe('The action to perform'),
});

const vacuumControl: ToolDefinition = {
  name: 'vacuum_control',
  description: 'Control robot vacuums. Start, stop, pause, return to base, or locate the vacuum.',
  inputSchema,
  category: 'device-control',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, action } = input;
      await context.hassClient.callService('vacuum', action, {}, { entity_id });

      return {
        success: true,
        result: `Vacuum ${entity_id} ${action} executed successfully`,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to control vacuum: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(vacuumControl);
