import type { Conversation } from '../../lib/types';
import ConversationList from '../conversations/ConversationList';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  loading,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}: SidebarProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* New Chat button */}
      <div className="p-3">
        <button
          onClick={() => onCreate()}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-slate-500 border-t-slate-200 rounded-full animate-spin" />
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelect={onSelect}
            onDelete={onDelete}
            onRename={onRename}
          />
        )}
      </div>
    </div>
  );
}
