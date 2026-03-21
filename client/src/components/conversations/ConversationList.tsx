import type { Conversation } from '../../lib/types';
import ConversationItem from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onDelete,
  onRename,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        No conversations yet
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === activeConversationId}
          onSelect={() => onSelect(conv.id)}
          onDelete={() => onDelete(conv.id)}
          onRename={(title) => onRename(conv.id, title)}
        />
      ))}
    </div>
  );
}
