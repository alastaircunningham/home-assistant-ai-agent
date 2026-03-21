import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z
    .string()
    .describe('The entity ID of the cover (e.g. cover.garage_door, cover.living_room_blinds)'),
  action: z.enum(['open', 'close', 'stop', 'set_position']).describe('The action to perform'),
  position: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Position 0 (closed) to 100 (open), for set_position action'),
});

const serviceMap: Record<string, string> = {
  open: 'open_cover',
  close: 'close_cover',
  stop: 'stop_cover',
  set_position: 'set_cover_position',
};

const coverControl: ToolDefinition = {
  name: 'cover_control',
  description:
    'Control covers such as blinds, shades, and garage doors. Open, close, stop, or set position (0-100).',
  inputSchema,
  category: 'device-control',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, action, position } = input;
      const service = serviceMap[action] ?? action;
      const serviceData: Record<string, any> = {};

      if (action === 'set_position' && position !== undefined) {
        serviceData.position = position;
      }

      await context.hassClient.callService('cover', service, serviceData, { entity_id });

      return {
        success: true,
        result: `Cover ${entity_id} ${action} executed successfully`,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to control cover: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(coverControl);
