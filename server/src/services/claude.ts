import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { getSetting } from '../db/settings.repo.js';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

export type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'tool_result'; tool_use_id: string; content: string };

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

export interface StreamCallbacks {
  onText: (text: string) => void;
  onToolUse: (toolUse: { id: string; name: string; input: any }) => void;
  onComplete: (response: Anthropic.Message) => void;
  onError: (error: Error) => void;
}

/**
 * Create an Anthropic client instance.
 * Uses API key from DB settings first, then falls back to config.
 */
export function createClient(): Anthropic {
  const apiKey = getSetting('anthropic_api_key') ?? config.anthropicApiKey;
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }
  return new Anthropic({ apiKey });
}

/**
 * Get the model to use for chat.
 */
export function getModel(): string {
  return getSetting('model') ?? config.model;
}

/**
 * Build the system prompt for the Home Assistant AI agent.
 * Uses a DB override if one has been saved, otherwise returns the hardcoded default.
 */
export function buildSystemPrompt(): string {
  const override = getSetting('system_prompt');
  if (override) return override;
  return getDefaultSystemPrompt();
}

function getDefaultSystemPrompt(): string {
  return `You are an AI agent embedded directly in Home Assistant as a sidebar add-on. You have live API access to the user's Home Assistant instance and can control devices, query state, manage automations, and edit configuration files.

## Your capabilities

**Device control**
- Lights: turn on/off, brightness, colour temperature (lights_control)
- Climate: set temperature, HVAC mode, fan mode (climate_control)
- Covers: open/close/position blinds, garage doors (cover_control)
- Locks: lock/unlock — always requires confirmation (lock_control)
- Alarm: arm/disarm — always requires confirmation (alarm_control)
- Switches, fans, vacuums, media players (switch_control, fan_control, vacuum_control, media_control)

**Information & discovery**
- List and search all entities (list_devices, search_entities)
- Read current state of any entity (get_entity_state)
- View historical state data (get_history)
- Browse installed add-ons (addon_info)

**Automations & scenes**
- Trigger, enable, or disable automations (automation_manage)
- Activate scenes (scene_activate)
- Send persistent notifications (send_notification)

**Configuration file editing**
- Read, list, and write YAML config files (config_editor) — always requires confirmation
- Supports: automations.yaml, scripts.yaml, scenes.yaml, groups.yaml, and any custom YAML files

## How to behave

**Always act, don't just advise.** If the user asks you to do something, use the appropriate tool. Don't describe what they should do themselves.

**Discover before acting.** If you don't know an entity ID, use search_entities or list_devices first. Never guess entity IDs.

**Be concise.** This is a chat UI in a sidebar — keep responses short and direct. One or two sentences after a successful action is enough. Use markdown lists for multi-item results.

**Chain tool calls for compound questions.** "Which lights are on in the kitchen?" should call list_devices filtered by domain and area, then format the results — not ask the user for more information.

**Before security-sensitive actions** (locks, alarms, config writes), briefly explain what you're about to do in one sentence, then call the tool. The user will see a confirmation prompt — your explanation helps them decide.

**Config file editing workflow:**
1. Use config_editor with action=list to see available files
2. Use action=read to read the current file content before modifying it
3. Preserve the existing structure and style of the file
4. Write the complete updated file content (not a diff)
5. After writing, tell the user they may need to reload HA configuration

**When a tool fails:** Report the error clearly, suggest what might be wrong (e.g. entity doesn't exist, HA restarting), and offer an alternative if one exists.

**Formatting:**
- Use **bold** for entity names and values
- Use code blocks for entity IDs and YAML
- Keep confirmation explanations to one sentence`;
}

// All current Claude models have a 200k token context window.
const MODEL_CONTEXT_WINDOW = 200_000;
const MAX_RESPONSE_TOKENS = 4_096;
// Reserve 80% of the window for input, minus the response budget.
const CONTEXT_BUDGET = Math.floor(MODEL_CONTEXT_WINDOW * 0.8) - MAX_RESPONSE_TOKENS;
// Warn when input tokens exceed 60% of the budget (before truncation kicks in).
export const CONTEXT_WARN_THRESHOLD = Math.floor(CONTEXT_BUDGET * 0.6);

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function estimateMessageTokens(messages: ClaudeMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    total += 4; // per-message overhead
    if (typeof msg.content === 'string') {
      total += estimateTokens(msg.content);
    } else {
      for (const block of msg.content) {
        if (block.type === 'text') {
          total += estimateTokens(block.text);
        } else if (block.type === 'tool_use') {
          total += estimateTokens(block.name) + estimateTokens(JSON.stringify(block.input));
        } else if (block.type === 'tool_result') {
          total += estimateTokens(block.content);
        }
      }
    }
  }
  return total;
}

const TRUNCATION_NOTE =
  '[Note: Earlier messages in this conversation were omitted to fit within the context window.]';

export function estimateInputTokens(messages: ClaudeMessage[]): number {
  return estimateTokens(buildSystemPrompt()) + estimateMessageTokens(messages);
}

/**
 * Truncate messages to fit within the context budget using a sliding window.
 * Always keeps the most recent messages; prepends a note if any were dropped.
 */
export function truncateMessages(messages: ClaudeMessage[]): {
  messages: ClaudeMessage[];
  wasTruncated: boolean;
} {
  const systemTokens = estimateTokens(buildSystemPrompt());
  const availableTokens = CONTEXT_BUDGET - systemTokens;

  if (estimateMessageTokens(messages) <= availableTokens) {
    return { messages, wasTruncated: false };
  }

  // Reserve space for the truncation note we'll prepend
  const noteTokens = estimateTokens(TRUNCATION_NOTE) + 4;
  const budgetForMessages = availableTokens - noteTokens;

  // Build from newest to oldest until we hit the budget
  const kept: ClaudeMessage[] = [];
  let tokensUsed = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateMessageTokens([messages[i]!]);
    if (tokensUsed + msgTokens > budgetForMessages) break;
    kept.unshift(messages[i]!);
    tokensUsed += msgTokens;
  }

  // Claude API requires conversations to start with a user message
  while (kept.length > 0 && kept[0]!.role !== 'user') {
    kept.shift();
  }

  // Fallback: always keep at least the last user message
  if (kept.length === 0) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.role === 'user') {
        kept.push(messages[i]!);
        break;
      }
    }
  }

  // Prepend truncation note to the first kept user message
  if (kept.length > 0 && typeof kept[0]!.content === 'string') {
    kept[0] = { ...kept[0]!, content: TRUNCATION_NOTE + '\n\n' + kept[0]!.content };
  }

  return { messages: kept, wasTruncated: true };
}

/**
 * Send a message to Claude with streaming and tool use support.
 * Returns the final complete response message.
 */
export async function streamChat(
  messages: ClaudeMessage[],
  tools: ClaudeTool[],
  callbacks: StreamCallbacks,
): Promise<Anthropic.Message> {
  const client = createClient();
  const model = getModel();
  const systemPrompt = buildSystemPrompt();

  logger.debug('Starting Claude stream', {
    model,
    messageCount: messages.length,
    toolCount: tools.length,
  });

  try {
    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages as Anthropic.MessageParam[],
      tools: tools as Anthropic.Tool[],
    });

    // Collect text deltas
    stream.on('text', (text) => {
      callbacks.onText(text);
    });

    // Get the final message
    const finalMessage = await stream.finalMessage();

    // Extract tool_use blocks from the response
    for (const block of finalMessage.content) {
      if (block.type === 'tool_use') {
        callbacks.onToolUse({
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }

    callbacks.onComplete(finalMessage);
    return finalMessage;
  } catch (err) {
    const error = err as Error;
    logger.error('Claude stream error', { error: error.message });
    callbacks.onError(error);
    throw error;
  }
}
