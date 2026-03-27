import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z.string().describe('The entity ID to get history for'),
  hours_back: z.number().optional().describe('Number of hours of history to retrieve (default 24)'),
  max_points: z
    .number()
    .optional()
    .describe('Maximum number of data points to return (default 100). Increase for more detail.'),
});

interface HistoryPoint {
  state: string;
  last_changed: string;
}

interface HistorySummary {
  count_raw: number;
  count_returned: number;
  first: string;
  last: string;
  first_time: string;
  last_time: string;
  min?: number;
  max?: number;
  mean?: number;
  unit?: string;
}

function downsample(points: HistoryPoint[], maxPoints: number): HistoryPoint[] {
  if (points.length <= maxPoints) return points;

  // Always include first and last
  const result: HistoryPoint[] = [];
  const step = (points.length - 1) / (maxPoints - 1);

  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round(i * step);
    result.push(points[Math.min(idx, points.length - 1)]);
  }

  return result;
}

function computeSummary(points: HistoryPoint[], unit?: string): HistorySummary {
  const summary: HistorySummary = {
    count_raw: points.length,
    count_returned: points.length,
    first: points[0]?.state ?? '',
    last: points[points.length - 1]?.state ?? '',
    first_time: points[0]?.last_changed ?? '',
    last_time: points[points.length - 1]?.last_changed ?? '',
  };

  if (unit !== undefined) {
    summary.unit = unit;
  }

  // Try numeric stats
  const numericValues = points.map((p) => parseFloat(p.state)).filter((v) => !isNaN(v));
  if (numericValues.length > 0) {
    summary.min = Math.min(...numericValues);
    summary.max = Math.max(...numericValues);
    summary.mean = Math.round((numericValues.reduce((a, b) => a + b, 0) / numericValues.length) * 100) / 100;
  }

  return summary;
}

const getHistory: ToolDefinition = {
  name: 'get_history',
  description:
    'Get the state history of a Home Assistant entity over a time period. Returns a summary (min/max/mean) and a downsampled series of state changes to conserve tokens.',
  inputSchema,
  category: 'system',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, hours_back, max_points } = input;
      const hours = hours_back ?? 24;
      const limit = max_points ?? 100;
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const rawHistory = await context.hassClient.getHistory(entity_id, startTime);

      // HA returns array of arrays (one per entity)
      const entityHistory: any[] = Array.isArray(rawHistory) && Array.isArray(rawHistory[0])
        ? rawHistory[0]
        : Array.isArray(rawHistory)
        ? rawHistory
        : [];

      if (entityHistory.length === 0) {
        return {
          success: true,
          result: {
            entity_id,
            period_hours: hours,
            summary: { count_raw: 0, count_returned: 0, first: null, last: null, first_time: null, last_time: null },
            history: [],
          },
        };
      }

      // Extract minimal fields only
      const points: HistoryPoint[] = entityHistory.map((record: any) => ({
        state: String(record.state ?? ''),
        last_changed: String(record.last_changed ?? ''),
      }));

      // Extract unit from first record's attributes if present
      const unit: string | undefined = entityHistory[0]?.attributes?.unit_of_measurement;

      const summary = computeSummary(points, unit);
      const downsampled = downsample(points, limit);
      summary.count_returned = downsampled.length;

      return {
        success: true,
        result: {
          entity_id,
          period_hours: hours,
          summary,
          history: downsampled,
        },
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to get history: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(getHistory);
