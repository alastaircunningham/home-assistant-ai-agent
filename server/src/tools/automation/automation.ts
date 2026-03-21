import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z
    .string()
    .describe('The entity ID of the automation (e.g. automation.morning_routine)'),
  action: z
    .enum(['trigger', 'turn_on', 'turn_off', 'toggle'])
    .describe('Action: trigger runs it once, turn_on/turn_off enables/disables it, toggle switches'),
});

const automationManage: ToolDefinition = {
  name: 'automation_manage',
  description:
    'Manage automations. Trigger an automation to run it immediately, or enable/disable it with turn_on/turn_off/toggle.',
  inputSchema,
  category: 'automation',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, action } = input;

      if (action === 'trigger') {
        await context.hassClient.triggerAutomation(entity_id);
      } else {
        await context.hassClient.callService('automation', action, {}, { entity_id });
      }

      return {
        success: true,
        result: `Automation ${entity_id} ${action} executed successfully`,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to manage automation: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(automationManage);
