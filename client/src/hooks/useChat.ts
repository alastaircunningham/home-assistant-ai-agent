import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message, ConfirmationRequest } from '../lib/types';
import { fetchConversation, sendMessage as apiSendMessage } from '../lib/api';
import { useWebSocket } from '../context/WebSocketContext';

export function useChat(activeConversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [confirmationRequest, setConfirmationRequest] = useState<ConfirmationRequest | null>(null);
  const [contextWarning, setContextWarning] = useState<'warning' | 'truncated' | null>(null);
  const { subscribe, send } = useWebSocket();
  const activeIdRef = useRef(activeConversationId);

  useEffect(() => {
    activeIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    setStreamingContent('');
    setIsStreaming(false);
    setConfirmationRequest(null);
    try {
      const data = await fetchConversation(conversationId);
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
      setContextWarning(null);
    } else {
      setMessages([]);
      setStreamingContent('');
      setIsStreaming(false);
      setConfirmationRequest(null);
      setContextWarning(null);
    }
  }, [activeConversationId, loadMessages]);

  // Handle WebSocket messages via direct subscription to avoid React batching dropping deltas
  useEffect(() => {
    return subscribe((msg) => {
      const { type } = msg;

      if (msg.conversation_id && msg.conversation_id !== activeIdRef.current) {
        return;
      }

      switch (type) {
        case 'message_delta': {
          setIsStreaming(true);
          setStreamingContent((prev) => prev + (msg.content as string || ''));
          break;
        }
        case 'message_complete': {
          setIsStreaming(false);
          setStreamingContent('');
          if (activeIdRef.current) {
            loadMessages(activeIdRef.current);
          }
          break;
        }
        case 'confirmation_required': {
          setConfirmationRequest({
            id: msg.id as string,
            tool_name: msg.tool_name as string,
            tool_input: msg.tool_input,
            description: msg.description as string,
            timeout_seconds: (msg.timeout_seconds as number) || 30,
          });
          break;
        }
        case 'context_truncated': {
          setContextWarning('truncated');
          break;
        }
        case 'context_warning': {
          if (!contextWarning) {
            setContextWarning('warning');
          }
          break;
        }
        case 'error': {
          console.error('WebSocket error:', msg.error);
          setIsStreaming(false);
          setStreamingContent('');
          break;
        }
      }
    });
  }, [subscribe, loadMessages]);

  const sendMessageToConversation = useCallback(
    async (content: string) => {
      if (!activeConversationId) return;

      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: activeConversationId,
        role: 'user',
        content,
        tool_name: null,
        tool_input: null,
        tool_result: null,
        created_at: new Date().toISOString(),
        seq: messages.length,
      };
      setMessages((prev) => [...prev, tempMessage]);

      try {
        await apiSendMessage(activeConversationId, content);
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [activeConversationId, messages.length],
  );

  const respondToConfirmation = useCallback(
    (confirmationId: string, approved: boolean) => {
      send({
        type: 'confirmation_response',
        id: confirmationId,
        approved,
      });
      setConfirmationRequest(null);
    },
    [send],
  );

  return {
    messages,
    loading,
    streamingContent,
    isStreaming,
    confirmationRequest,
    contextWarning,
    loadMessages,
    sendMessage: sendMessageToConversation,
    respondToConfirmation,
  };
}
