import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../logger.js';
import { addMessage, getMessages, getNextSeq, type Message } from '../db/messages.repo.js';
import { getToolsForClaude } from '../tools/index.js';
import { streamChat, type ClaudeMessage, type ClaudeContentBlock } from './claude.js';
import { executeTool, checkConfirmation } from './tool-executor.js';
import type { ToolContext } from '../tools/types.js';

function safeJsonParse(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export interface PendingConfirmation {
  id: string;
  conversationId: string;
  toolUseId: string;
  toolName: string;
  toolInput: any;
  messages: ClaudeMessage[];
  assistantMessageId: string;
}

// In-memory store for pending confirmations
const pendingConfirmations = new Map<string, PendingConfirmation>();
const CONFIRMATION_TIMEOUT_MS = 30_000;

export function getPendingConfirmation(id: string): PendingConfirmation | undefined {
  return pendingConfirmations.get(id);
}

export function removePendingConfirmation(id: string): void {
  pendingConfirmations.delete(id);
}

function setPendingConfirmation(id: string, confirmation: PendingConfirmation): void {
  pendingConfirmations.set(id, confirmation);
  // Auto-expire after timeout to prevent memory leaks
  setTimeout(() => {
    if (pendingConfirmations.has(id)) {
      logger.info(`Confirmation ${id} expired (${confirmation.toolName})`);
      pendingConfirmations.delete(id);
    }
  }, CONFIRMATION_TIMEOUT_MS);
}

export type WsBroadcast = (type: string, data?: Record<string, unknown>) => void;

/**
 * Convert DB messages to Claude API message format.
 */
function dbMessagesToClaudeMessages(dbMessages: Message[]): ClaudeMessage[] {
  const claudeMessages: ClaudeMessage[] = [];
  let i = 0;

  while (i < dbMessages.length) {
    const msg = dbMessages[i]!;

    if (msg.role === 'user') {
      claudeMessages.push({ role: 'user', content: msg.content ?? '' });
      i++;
    } else if (msg.role === 'assistant') {
      claudeMessages.push({ role: 'assistant', content: msg.content ?? '' });
      i++;
    } else if (msg.role === 'tool_use') {
      // Collect consecutive tool_use blocks as an assistant message
      const blocks: ClaudeContentBlock[] = [];
      while (i < dbMessages.length && dbMessages[i]!.role === 'tool_use') {
        const tu = dbMessages[i]!;
        blocks.push({
          type: 'tool_use',
          id: tu.id,
          name: tu.tool_name!,
          input: safeJsonParse(tu.tool_input),
        });
        i++;
      }
      claudeMessages.push({ role: 'assistant', content: blocks });
    } else if (msg.role === 'tool_result') {
      // Collect consecutive tool_result blocks as a user message
      const blocks: ClaudeContentBlock[] = [];
      while (i < dbMessages.length && dbMessages[i]!.role === 'tool_result') {
        const tr = dbMessages[i]!;
        blocks.push({
          type: 'tool_result',
          tool_use_id: tr.tool_name!, // We store the tool_use_id in tool_name for tool_results
          content: tr.tool_result ?? '',
        });
        i++;
      }
      claudeMessages.push({ role: 'user', content: blocks });
    } else {
      i++;
    }
  }

  return claudeMessages;
}

/**
 * Handle an incoming user message: save it, send to Claude, handle tool use loop.
 */
export async function handleMessage(
  conversationId: string,
  userContent: string,
  wsBroadcast: WsBroadcast,
  toolContext: ToolContext,
): Promise<{ userMessageId: string }> {
  // Save user message
  const userSeq = getNextSeq(conversationId);
  const userMsg = addMessage({
    id: uuidv4(),
    conversation_id: conversationId,
    role: 'user',
    content: userContent,
    seq: userSeq,
  });

  // Load conversation history and convert to Claude format
  const dbMessages = getMessages(conversationId);
  const claudeMessages = dbMessagesToClaudeMessages(dbMessages);
  const tools = getToolsForClaude();

  // Start the Claude conversation loop (runs async)
  runConversationLoop(conversationId, claudeMessages, tools, wsBroadcast, toolContext).catch(
    (err) => {
      logger.error('Conversation loop error', { error: (err as Error).message, conversationId });
      wsBroadcast('error', { conversationId, error: (err as Error).message });
    },
  );

  return { userMessageId: userMsg.id };
}

/**
 * Run the Claude conversation loop, handling tool use and streaming.
 */
async function runConversationLoop(
  conversationId: string,
  messages: ClaudeMessage[],
  tools: ReturnType<typeof getToolsForClaude>,
  wsBroadcast: WsBroadcast,
  toolContext: ToolContext,
): Promise<void> {
  let currentMessages = [...messages];
  let continueLoop = true;

  while (continueLoop) {
    continueLoop = false;
    let fullText = '';
    const toolUses: Array<{ id: string; name: string; input: any }> = [];

    // Stream from Claude
    const response = await streamChat(currentMessages, tools, {
      onText: (text) => {
        fullText += text;
        wsBroadcast('message_delta', { conversation_id: conversationId, content: text });
      },
      onToolUse: (toolUse) => {
        toolUses.push(toolUse);
      },
      onComplete: () => {
        // Will be handled below
      },
      onError: (error) => {
        wsBroadcast('error', { conversationId, error: error.message });
      },
    });

    // Save assistant text if any
    if (fullText) {
      const assistantSeq = getNextSeq(conversationId);
      addMessage({
        id: uuidv4(),
        conversation_id: conversationId,
        role: 'assistant',
        content: fullText,
        seq: assistantSeq,
      });
    }

    // Signal end of text stream
    wsBroadcast('message_complete', { conversation_id: conversationId });

    // Handle tool uses
    if (toolUses.length > 0) {
      // Save tool_use messages
      const toolUseBlocks: ClaudeContentBlock[] = [];
      for (const tu of toolUses) {
        const tuSeq = getNextSeq(conversationId);
        addMessage({
          id: tu.id,
          conversation_id: conversationId,
          role: 'tool_use',
          tool_name: tu.name,
          tool_input: JSON.stringify(tu.input),
          seq: tuSeq,
        });
        toolUseBlocks.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input });
      }

      // Build assistant message with all content blocks
      const assistantContent: ClaudeContentBlock[] = [];
      if (fullText) {
        assistantContent.push({ type: 'text', text: fullText });
      }
      assistantContent.push(...toolUseBlocks);

      // Add the full assistant message to conversation
      currentMessages.push({ role: 'assistant', content: assistantContent });

      // Process each tool use
      const toolResultBlocks: ClaudeContentBlock[] = [];
      let hasPendingConfirmation = false;

      for (const tu of toolUses) {
        const policy = checkConfirmation(tu.name);

        wsBroadcast('tool_executing', {
          conversation_id: conversationId,
          tool_use_id: tu.id,
          tool_name: tu.name,
          tool_input: tu.input,
        });

        if (policy === 'auto_approve') {
          const result = await executeTool(tu.name, tu.input, toolContext);
          const resultStr = JSON.stringify(result);

          const trSeq = getNextSeq(conversationId);
          addMessage({
            id: uuidv4(),
            conversation_id: conversationId,
            role: 'tool_result',
            tool_name: tu.id, // Store tool_use_id for mapping
            tool_result: resultStr,
            seq: trSeq,
          });

          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: resultStr,
          });

          wsBroadcast('tool_result', {
            conversation_id: conversationId,
            tool_use_id: tu.id,
            tool_name: tu.name,
            success: result.success,
            result: result.result,
            error: result.error,
          });
        } else if (policy === 'auto_deny') {
          const deniedResult = JSON.stringify({
            success: false,
            result: null,
            error: 'Tool execution was denied by policy',
          });

          const trSeq = getNextSeq(conversationId);
          addMessage({
            id: uuidv4(),
            conversation_id: conversationId,
            role: 'tool_result',
            tool_name: tu.id,
            tool_result: deniedResult,
            seq: trSeq,
          });

          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: deniedResult,
          });

          wsBroadcast('tool_result', {
            conversation_id: conversationId,
            tool_use_id: tu.id,
            tool_name: tu.name,
            success: false,
            result: null,
            error: 'Denied by policy',
          });
        } else {
          // always_confirm - pause and wait for user confirmation
          hasPendingConfirmation = true;
          const confirmationId = uuidv4();

          setPendingConfirmation(confirmationId, {
            id: confirmationId,
            conversationId,
            toolUseId: tu.id,
            toolName: tu.name,
            toolInput: tu.input,
            messages: currentMessages,
            assistantMessageId: tu.id,
          });

          wsBroadcast('confirmation_required', {
            id: confirmationId,
            conversation_id: conversationId,
            tool_name: tu.name,
            tool_input: tu.input,
            description: `Execute ${tu.name}`,
            timeout_seconds: 30,
          });
        }
      }

      // If we have pending confirmations, stop the loop and wait
      if (hasPendingConfirmation) {
        return;
      }

      // If all tools were auto-processed, add results and continue loop
      if (toolResultBlocks.length > 0) {
        currentMessages.push({ role: 'user', content: toolResultBlocks });
        continueLoop = response.stop_reason === 'tool_use';
      }
    }
  }
}

/**
 * Resume the conversation after a confirmation response.
 */
export async function resumeAfterConfirmation(
  confirmationId: string,
  approved: boolean,
  wsBroadcast: WsBroadcast,
  toolContext: ToolContext,
): Promise<void> {
  const pending = pendingConfirmations.get(confirmationId);
  if (!pending) {
    logger.warn('No pending confirmation found', { confirmationId });
    return;
  }

  pendingConfirmations.delete(confirmationId);

  const { conversationId, toolUseId, toolName, toolInput, messages } = pending;
  let resultStr: string;

  if (approved) {
    const result = await executeTool(toolName, toolInput, toolContext);
    resultStr = JSON.stringify(result);

    wsBroadcast('tool_result', {
      conversation_id: conversationId,
      tool_use_id: toolUseId,
      tool_name: toolName,
      success: result.success,
      result: result.result,
      error: result.error,
    });
  } else {
    resultStr = JSON.stringify({
      success: false,
      result: null,
      error: 'User denied the tool execution',
    });

    wsBroadcast('tool_result', {
      conversation_id: conversationId,
      tool_use_id: toolUseId,
      tool_name: toolName,
      success: false,
      result: null,
      error: 'User denied',
    });
  }

  // Save tool result to DB
  const trSeq = getNextSeq(conversationId);
  addMessage({
    id: uuidv4(),
    conversation_id: conversationId,
    role: 'tool_result',
    tool_name: toolUseId,
    tool_result: resultStr,
    seq: trSeq,
  });

  // Build messages with the tool result and continue the loop
  const updatedMessages: ClaudeMessage[] = [
    ...messages,
    {
      role: 'user',
      content: [
        {
          type: 'tool_result' as const,
          tool_use_id: toolUseId,
          content: resultStr,
        },
      ],
    },
  ];

  const tools = getToolsForClaude();

  // Continue the conversation loop
  await runConversationLoop(conversationId, updatedMessages, tools, wsBroadcast, toolContext);
}
