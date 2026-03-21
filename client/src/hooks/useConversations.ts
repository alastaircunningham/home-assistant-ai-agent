import { useCallback, useEffect, useState } from 'react';
import type { Conversation } from '../lib/types';
import {
  fetchConversations,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  updateConversationTitle,
} from '../lib/api';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchConversations();
      setConversations(data);
      if (data.length > 0) {
        // Auto-select the most recent conversation
        setActiveConversationId(data[0]!.id);
      } else {
        // No conversations yet — create one so the input is immediately usable
        const conv = await apiCreateConversation('New conversation');
        setConversations([conv]);
        setActiveConversationId(conv.id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const createConversation = useCallback(async (title?: string) => {
    try {
      const conv = await apiCreateConversation(title);
      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
      return conv;
    } catch (err) {
      console.error('Failed to create conversation:', err);
      return null;
    }
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiDeleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    },
    [activeConversationId],
  );

  const renameConversation = useCallback(async (id: string, title: string) => {
    try {
      const updated = await updateConversationTitle(id, title);
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  return {
    conversations,
    activeConversationId,
    activeConversation,
    loading,
    loadConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
  };
}
