import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../../lib/types';

interface AssistantMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function AssistantMessage({ message, isStreaming }: AssistantMessageProps) {
  return (
    <div className="flex gap-3 max-w-3xl">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-2.5 text-sm leading-relaxed shadow-sm">
          <div className="prose prose-sm prose-slate max-w-none prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-lg prose-pre:text-xs prose-code:text-blue-600 prose-code:before:content-none prose-code:after:content-none prose-a:text-blue-600">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || ''}
            </ReactMarkdown>
          </div>
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
          )}
        </div>
      </div>
    </div>
  );
}
