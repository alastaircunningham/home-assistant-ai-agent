import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z
    .string()
    .describe('The entity ID of the alarm panel (e.g. alarm_control_panel.home)'),
  action: z
    .enum(['arm_home', 'arm_away', 'arm_night', 'disarm', 'trigger'])
    .describe('The action to perform'),
  code: z.string().optional().describe('Alarm code if required'),
});

const serviceMap: Record<string, string> = {
  arm_home: 'alarm_arm_home',
  arm_away: 'alarm_arm_away',
  arm_night: 'alarm_arm_night',
  disarm: 'alarm_disarm',
  trigger: 'alarm_trigger',
};

const alarmControl: ToolDefinition = {
  name: 'alarm_control',
  description:
    'Control alarm panels. Arm (home/away/night), disarm, or trigger. This is a security-sensitive action that requires confirmation.',
  inputSchema,
  category: 'device-control',
  confirmationDefault: 'always_confirm',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, action, code } = input;
      const service = serviceMap[action] ?? action;
      const serviceData: Record<string, any> = {};
      if (code) serviceData.code = code;

      await context.hassClient.callService('alarm_control_panel', service, serviceData, {
        entity_id,
      });

      return {
        success: true,
        result: `Alarm ${entity_id} ${action} executed successfully`,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to control alarm: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(alarmControl);
