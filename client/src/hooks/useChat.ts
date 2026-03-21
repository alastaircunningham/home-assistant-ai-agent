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
  const { lastMessage, send } = useWebSocket();
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
    } else {
      setMessages([]);
      setStreamingContent('');
      setIsStreaming(false);
      setConfirmationRequest(null);
    }
  }, [activeConversationId, loadMessages]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const { type } = lastMessage;

    if (lastMessage.conversation_id && lastMessage.conversation_id !== activeIdRef.current) {
      return;
    }

    switch (type) {
      case 'message_delta': {
        setIsStreaming(true);
        setStreamingContent((prev) => prev + (lastMessage.content as string || ''));
        break;
      }
      case 'message_complete': {
        setIsStreaming(false);
        setStreamingContent('');
        // Reload messages from server to get the persisted version
        if (activeIdRef.current) {
          loadMessages(activeIdRef.current);
        }
        break;
      }
      case 'tool_executing': {
        // No-op: message_complete will reload all messages
        break;
      }
      case 'tool_result': {
        // No-op: message_complete will reload all messages
        break;
      }
      case 'confirmation_required': {
        setConfirmationRequest({
          id: lastMessage.id as string,
          tool_name: lastMessage.tool_name as string,
          tool_input: lastMessage.tool_input,
          description: lastMessage.description as string,
          timeout_seconds: (lastMessage.timeout_seconds as number) || 30,
        });
        break;
      }
      case 'error': {
        console.error('WebSocket error:', lastMessage.error);
        setIsStreaming(false);
        setStreamingContent('');
        break;
      }
    }
  }, [lastMessage]);

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
    loadMessages,
    sendMessage: sendMessageToConversation,
    respondToConfirmation,
  };
}
