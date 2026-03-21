import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z.string().describe('The entity ID of the light (e.g. light.living_room)'),
  action: z.enum(['turn_on', 'turn_off', 'toggle']).describe('The action to perform'),
  brightness: z.number().min(0).max(255).optional().describe('Brightness level 0-255'),
  color: z
    .object({
      r: z.number().min(0).max(255),
      g: z.number().min(0).max(255),
      b: z.number().min(0).max(255),
    })
    .optional()
    .describe('RGB color values'),
  color_temp: z.number().optional().describe('Color temperature in mireds'),
});

const lightsControl: ToolDefinition = {
  name: 'lights_control',
  description:
    'Control lights in the home. Turn on/off, toggle, set brightness (0-255), set RGB color, or set color temperature.',
  inputSchema,
  category: 'device-control',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, action, brightness, color, color_temp } = input;
      const serviceData: Record<string, any> = {};

      if (brightness !== undefined) serviceData.brightness = brightness;
      if (color) serviceData.rgb_color = [color.r, color.g, color.b];
      if (color_temp !== undefined) serviceData.color_temp = color_temp;

      await context.hassClient.callService('light', action, serviceData, { entity_id });

      return {
        success: true,
        result: `Light ${entity_id} ${action} executed successfully`,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to control light: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(lightsControl);
