import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z.string().describe('The entity ID of the scene (e.g. scene.movie_night)'),
});

const sceneActivate: ToolDefinition = {
  name: 'scene_activate',
  description: 'Activate a Home Assistant scene, applying all its predefined entity states at once.',
  inputSchema,
  category: 'automation',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id } = input;
      await context.hassClient.activateScene(entity_id);

      return {
        success: true,
        result: `Scene ${entity_id} activated successfully`,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to activate scene: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(sceneActivate);
