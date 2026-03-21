import { useEffect, useRef } from 'react';
import type { Message, ConfirmationRequest } from '../../lib/types';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';
import ToolUseMessage from './ToolUseMessage';
import ToolResultMessage from './ToolResultMessage';
import ConfirmationCard from './ConfirmationCard';

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  loading: boolean;
  confirmationRequest: ConfirmationRequest | null;
  onRespondToConfirmation: (id: string, approved: boolean) => void;
}

export default function MessageList({
  messages,
  streamingContent,
  isStreaming,
  loading,
  confirmationRequest,
  onRespondToConfirmation,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, confirmationRequest]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 px-4">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <p className="text-sm">Start a conversation by sending a message</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((msg) => {
        switch (msg.role) {
          case 'user':
            return <UserMessage key={msg.id} message={msg} />;
          case 'assistant':
            return <AssistantMessage key={msg.id} message={msg} />;
          case 'tool_use':
            return <ToolUseMessage key={msg.id} message={msg} />;
          case 'tool_result':
            return <ToolResultMessage key={msg.id} message={msg} />;
          default:
            return null;
        }
      })}

      {/* Streaming content */}
      {isStreaming && streamingContent && (
        <AssistantMessage
          message={{
            id: 'streaming',
            conversation_id: '',
            role: 'assistant',
            content: streamingContent,
            tool_name: null,
            tool_input: null,
            tool_result: null,
            created_at: new Date().toISOString(),
            seq: -1,
          }}
          isStreaming
        />
      )}

      {/* Streaming indicator when no content yet */}
      {isStreaming && !streamingContent && (
        <div className="flex gap-3 max-w-3xl">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div className="flex items-center gap-1 py-2">
            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* Confirmation card */}
      {confirmationRequest && (
        <ConfirmationCard
          request={confirmationRequest}
          onRespond={onRespondToConfirmation}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
