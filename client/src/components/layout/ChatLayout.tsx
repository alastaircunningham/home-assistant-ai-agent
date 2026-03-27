import type { Message, Settings, ConfirmationRequest, ConfirmationPolicy } from '../../lib/types';
import Header from './Header';
import MessageList from '../chat/MessageList';
import ChatInput from '../chat/ChatInput';

interface ChatLayoutProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  confirmationRequest: ConfirmationRequest | null;
  contextWarning: 'warning' | 'truncated' | null;
  messagesLoading: boolean;
  onSendMessage: (content: string) => void;
  onRespondToConfirmation: (id: string, approved: boolean) => void;
  onOpenSettings: () => void;
}

export default function ChatLayout({
  messages,
  streamingContent,
  isStreaming,
  confirmationRequest,
  contextWarning,
  messagesLoading,
  onSendMessage,
  onRespondToConfirmation,
  onOpenSettings,
}: ChatLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      <div className="flex flex-col flex-1 min-w-0">
        <Header onOpenSettings={onOpenSettings} />

        <div className="flex-1 overflow-hidden flex flex-col">
          <MessageList
            messages={messages}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            loading={messagesLoading}
            confirmationRequest={confirmationRequest}
            onRespondToConfirmation={onRespondToConfirmation}
          />

          {contextWarning && (
            <div className="px-4 py-2 text-xs text-amber-800 bg-amber-50 border-t border-amber-200">
              {contextWarning === 'truncated'
                ? 'Earlier messages were omitted to fit within the context window. Older messages are automatically removed after 30 days.'
                : 'This conversation is getting long. Older messages will be automatically removed after 30 days.'}
            </div>
          )}

          <ChatInput
            onSend={onSendMessage}
            disabled={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
