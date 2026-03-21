import { useState } from 'react';
import { IngressProvider } from './context/IngressContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { useConversations } from './hooks/useConversations';
import { useChat } from './hooks/useChat';
import { useSettings } from './hooks/useSettings';
import ChatLayout from './components/layout/ChatLayout';
import SettingsModal from './components/settings/SettingsModal';

function AppInner() {
  const {
    conversations,
    activeConversationId,
    activeConversation,
    loading: conversationsLoading,
    selectConversation,
    createConversation,
    deleteConversation,
    renameConversation,
  } = useConversations();

  const {
    messages,
    loading: messagesLoading,
    streamingContent,
    isStreaming,
    confirmationRequest,
    sendMessage,
    respondToConfirmation,
  } = useChat(activeConversationId);

  const {
    settings,
    policies,
    loadSettings,
    updateSettings,
    updateConfirmationPolicy,
  } = useSettings();

  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <ChatLayout
        conversations={conversations}
        activeConversationId={activeConversationId}
        activeConversation={activeConversation}
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        confirmationRequest={confirmationRequest}
        conversationsLoading={conversationsLoading}
        messagesLoading={messagesLoading}
        onSelectConversation={selectConversation}
        onCreateConversation={createConversation}
        onDeleteConversation={deleteConversation}
        onRenameConversation={renameConversation}
        onSendMessage={sendMessage}
        onRespondToConfirmation={respondToConfirmation}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsModal
        isOpen={settingsOpen}
        settings={settings}
        policies={policies}
        onSave={updateSettings}
        onUpdatePolicy={updateConfirmationPolicy}
        onClose={() => setSettingsOpen(false)}
        onLoad={loadSettings}
      />
    </>
  );
}

export default function App() {
  return (
    <IngressProvider>
      <WebSocketProvider>
        <AppInner />
      </WebSocketProvider>
    </IngressProvider>
  );
}
