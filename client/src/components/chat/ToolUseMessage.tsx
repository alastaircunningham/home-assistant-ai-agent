import { useState } from 'react';
import type { Message } from '../../lib/types';

interface ToolUseMessageProps {
  message: Message;
  hasResult: boolean;
}

export default function ToolUseMessage({ message, hasResult }: ToolUseMessageProps) {
  const [expanded, setExpanded] = useState(false);

  let parsedInput: string | null = null;
  if (message.tool_input) {
    try {
      parsedInput = JSON.stringify(JSON.parse(message.tool_input), null, 2);
    } catch {
      parsedInput = message.tool_input;
    }
  }

  return (
    <div className="flex gap-3 max-w-3xl">
      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.079a.75.75 0 01-1.088-.79l.72-5.037L1.26 8.126a.75.75 0 01.416-1.28l5.059-.735L9.072 1.57a.75.75 0 011.356 0l2.337 4.541 5.059.735a.75.75 0 01.416 1.28l-3.408 4.296.72 5.037a.75.75 0 01-1.088.79l-5.384-3.079z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-amber-800">Tool: {message.tool_name}</span>
            {!hasResult && (
              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-amber-700 rounded-full animate-spin" />
            )}
          </div>

          {parsedInput && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1.5 text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              {expanded ? 'Hide' : 'Show'} input
            </button>
          )}

          {expanded && parsedInput && (
            <pre className="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto">
              {parsedInput}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
