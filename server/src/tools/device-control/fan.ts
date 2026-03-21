import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z.string().describe('The entity ID of the fan (e.g. fan.bedroom)'),
  action: z
    .enum(['turn_on', 'turn_off', 'toggle', 'set_speed', 'set_direction'])
    .describe('The action to perform'),
  speed_percentage: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Speed percentage 0-100 (for set_speed)'),
  direction: z
    .enum(['forward', 'reverse'])
    .optional()
    .describe('Fan direction (for set_direction)'),
});

const fanControl: ToolDefinition = {
  name: 'fan_control',
  description:
    'Control fans. Turn on/off, toggle, set speed percentage (0-100), or set direction (forward/reverse).',
  inputSchema,
  category: 'device-control',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, action, speed_percentage, direction } = input;
      const serviceData: Record<string, any> = {};

      if (action === 'set_speed') {
        serviceData.percentage = speed_percentage;
        await context.hassClient.callService('fan', 'set_percentage', serviceData, { entity_id });
      } else if (action === 'set_direction') {
        serviceData.direction = direction;
        await context.hassClient.callService('fan', 'set_direction', serviceData, { entity_id });
      } else {
        await context.hassClient.callService('fan', action, serviceData, { entity_id });
      }

      return {
        success: true,
        result: `Fan ${entity_id} ${action} executed successfully`,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to control fan: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(fanControl);
