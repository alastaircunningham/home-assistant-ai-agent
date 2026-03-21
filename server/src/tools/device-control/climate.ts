import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z.string().describe('The entity ID of the climate device (e.g. climate.living_room)'),
  action: z
    .enum(['set_temperature', 'set_hvac_mode', 'set_fan_mode', 'turn_on', 'turn_off'])
    .describe('The action to perform'),
  temperature: z.number().optional().describe('Target temperature'),
  hvac_mode: z
    .enum(['heat', 'cool', 'auto', 'off', 'heat_cool', 'fan_only', 'dry'])
    .optional()
    .describe('HVAC mode'),
  fan_mode: z.string().optional().describe('Fan mode (e.g. auto, low, medium, high)'),
});

const climateControl: ToolDefinition = {
  name: 'climate_control',
  description:
    'Control climate/HVAC devices. Set temperature, change HVAC mode (heat/cool/auto/off), set fan mode, or turn on/off.',
  inputSchema,
  category: 'device-control',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, action, temperature, hvac_mode, fan_mode } = input;

      if (action === 'set_temperature') {
        await context.hassClient.callService(
          'climate',
          'set_temperature',
          { temperature },
          { entity_id },
        );
      } else if (action === 'set_hvac_mode') {
        await context.hassClient.callService(
          'climate',
          'set_hvac_mode',
          { hvac_mode },
          { entity_id },
        );
      } else if (action === 'set_fan_mode') {
        await context.hassClient.callService(
          'climate',
          'set_fan_mode',
          { fan_mode },
          { entity_id },
        );
      } else {
        await context.hassClient.callService('climate', action, {}, { entity_id });
      }

      return {
        success: true,
        result: `Climate ${entity_id} ${action} executed successfully`,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to control climate: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(climateControl);
