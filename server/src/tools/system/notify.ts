import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  message: z.string().describe('The notification message'),
  title: z.string().optional().describe('The notification title'),
});

const sendNotification: ToolDefinition = {
  name: 'send_notification',
  description:
    'Send a persistent notification in Home Assistant. The notification will appear in the HA notifications panel.',
  inputSchema,
  category: 'system',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { message, title } = input;
      await context.hassClient.sendNotification(message, title);

      return {
        success: true,
        result: 'Notification sent successfully',
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to send notification: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(sendNotification);
