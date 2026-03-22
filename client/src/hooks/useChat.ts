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
  const { subscribe, send, isConnected } = useWebSocket();
  const activeIdRef = useRef(activeConversationId);
  // Monotonically-increasing counter so concurrent loadMessages calls don't
  // overwrite newer results with stale data (race condition when two
  // message_complete events fire back-to-back during a tool-use loop).
  const loadRequestIdRef = useRef(0);
  // Track whether we've ever connected so we can detect reconnects.
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    activeIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    setStreamingContent('');
    setIsStreaming(false);
    setConfirmationRequest(null);
    try {
      const data = await fetchConversation(conversationId);
      // Ignore stale responses superseded by a newer loadMessages call.
      if (requestId !== loadRequestIdRef.current) return;
      setMessages(data.messages);
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
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

  // Reload messages when the WebSocket reconnects after a disconnect.
  // This recovers the UI if a disconnect happened mid-stream and caused
  // message_complete / message_delta events to be lost.
  useEffect(() => {
    if (isConnected) {
      if (hasConnectedRef.current && activeIdRef.current) {
        loadMessages(activeIdRef.current);
      }
      hasConnectedRef.current = true;
    }
  }, [isConnected, loadMessages]);

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
          // Reload messages so whatever was saved to DB before the error is shown.
          if (activeIdRef.current) {
            loadMessages(activeIdRef.current);
          }
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
