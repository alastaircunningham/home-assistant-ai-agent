import { useState } from 'react';
import type { Conversation, Message, Settings, ConfirmationRequest, ConfirmationPolicy } from '../../lib/types';
import Header from './Header';
import Sidebar from './Sidebar';
import MessageList from '../chat/MessageList';
import ChatInput from '../chat/ChatInput';

interface ChatLayoutProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  confirmationRequest: ConfirmationRequest | null;
  conversationsLoading: boolean;
  messagesLoading: boolean;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onSendMessage: (content: string) => void;
  onRespondToConfirmation: (id: string, approved: boolean) => void;
  onOpenSettings: () => void;
}

export default function ChatLayout({
  conversations,
  activeConversationId,
  activeConversation,
  messages,
  streamingContent,
  isStreaming,
  confirmationRequest,
  conversationsLoading,
  messagesLoading,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onRenameConversation,
  onSendMessage,
  onRespondToConfirmation,
  onOpenSettings,
}: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30 w-80 transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0 md:z-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          loading={conversationsLoading}
          onSelect={(id) => {
            onSelectConversation(id);
            setSidebarOpen(false);
          }}
          onCreate={onCreateConversation}
          onDelete={onDeleteConversation}
          onRename={onRenameConversation}
        />
      </div>

      {/* Main panel */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          title={activeConversation?.title || 'AI Agent'}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSettings={onOpenSettings}
        />

        <div className="flex-1 overflow-hidden flex flex-col">
          <MessageList
            messages={messages}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            loading={messagesLoading}
            confirmationRequest={confirmationRequest}
            onRespondToConfirmation={onRespondToConfirmation}
          />

          <ChatInput
            onSend={onSendMessage}
            disabled={!activeConversationId || isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
