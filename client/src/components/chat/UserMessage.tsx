import type { Message } from '../../lib/types';

interface UserMessageProps {
  message: Message;
}

export default function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex gap-3 max-w-3xl ml-auto">
      <div className="flex-1 min-w-0">
        <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
    </div>
  );
}
