import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z
    .string()
    .describe('The entity ID of the media player (e.g. media_player.living_room)'),
  action: z
    .enum([
      'play',
      'pause',
      'stop',
      'next_track',
      'previous_track',
      'volume_set',
      'volume_up',
      'volume_down',
      'media_play',
    ])
    .describe('The action to perform'),
  volume_level: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Volume level 0.0-1.0 (for volume_set)'),
  media_content_id: z.string().optional().describe('Media content ID to play (for media_play)'),
  media_content_type: z
    .string()
    .optional()
    .describe('Media content type (e.g. music, video, playlist)'),
});

const serviceMap: Record<string, string> = {
  play: 'media_play',
  pause: 'media_pause',
  stop: 'media_stop',
  next_track: 'media_next_track',
  previous_track: 'media_previous_track',
  volume_set: 'volume_set',
  volume_up: 'volume_up',
  volume_down: 'volume_down',
  media_play: 'play_media',
};

const mediaControl: ToolDefinition = {
  name: 'media_control',
  description:
    'Control media players. Play, pause, stop, skip tracks, adjust volume, or play specific media content.',
  inputSchema,
  category: 'device-control',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, action, volume_level, media_content_id, media_content_type } = input;
      const service = serviceMap[action] ?? action;
      const serviceData: Record<string, any> = {};

      if (action === 'volume_set' && volume_level !== undefined) {
        serviceData.volume_level = volume_level;
      }
      if (action === 'media_play') {
        if (media_content_id) serviceData.media_content_id = media_content_id;
        if (media_content_type) serviceData.media_content_type = media_content_type;
      }

      await context.hassClient.callService('media_player', service, serviceData, { entity_id });

      return {
        success: true,
        result: `Media player ${entity_id} ${action} executed successfully`,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to control media player: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(mediaControl);
