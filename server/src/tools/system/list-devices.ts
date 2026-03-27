import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  query: z.string().optional().describe('Filter by name or entity ID (case-insensitive)'),
  domain: z
    .string()
    .optional()
    .describe('Filter by domain (e.g. light, switch, climate, sensor)'),
  area: z.string().optional().describe('Filter by area name'),
  limit: z.number().optional().describe('Maximum number of results to return (default 100)'),
});

const listDevices: ToolDefinition = {
  name: 'list_devices',
  description:
    'List and search Home Assistant entities/devices. Optionally filter by name query, domain, or area.',
  inputSchema,
  category: 'system',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { query, domain, limit } = input;
      const maxResults = limit ?? 100;
      let states = await context.hassClient.getStates();

      if (domain) {
        states = states.filter((s: any) => (s.entity_id as string).startsWith(`${domain}.`));
      }

      if (query) {
        const q = query.toLowerCase();
        states = states.filter((s: any) => {
          const entityId: string = s.entity_id ?? '';
          const friendlyName: string = s.attributes?.friendly_name ?? '';
          return entityId.toLowerCase().includes(q) || friendlyName.toLowerCase().includes(q);
        });
      }

      const allResults = states.map((s: any) => ({
        entity_id: s.entity_id,
        state: s.state,
        friendly_name: s.attributes?.friendly_name ?? null,
        domain: (s.entity_id as string).split('.')[0],
      }));

      const totalCount = allResults.length;
      const results = allResults.slice(0, maxResults);

      return {
        success: true,
        result: {
          count: results.length,
          total_count: totalCount,
          truncated: totalCount > maxResults,
          entities: results,
        },
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to list devices: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(listDevices);
