import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  query: z.string().describe('Search query to match against entity IDs and friendly names'),
});

const searchEntities: ToolDefinition = {
  name: 'search_entities',
  description:
    'Search for Home Assistant entities by name or entity ID. Returns matching entities with their current state.',
  inputSchema,
  category: 'system',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { query } = input;
      const results = await context.hassClient.searchEntities(query);

      const mapped = results.map((s: any) => ({
        entity_id: s.entity_id,
        state: s.state,
        friendly_name: s.attributes?.friendly_name ?? null,
        domain: (s.entity_id as string).split('.')[0],
      }));

      return {
        success: true,
        result: { count: mapped.length, entities: mapped },
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to search entities: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(searchEntities);
