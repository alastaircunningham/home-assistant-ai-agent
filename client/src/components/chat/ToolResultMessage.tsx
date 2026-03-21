import { useState } from 'react';
import type { Message } from '../../lib/types';

interface ToolResultMessageProps {
  message: Message;
}

export default function ToolResultMessage({ message }: ToolResultMessageProps) {
  const [expanded, setExpanded] = useState(false);

  const isError = message.tool_result?.toLowerCase().includes('error') ?? false;

  let displayResult: string | null = null;
  if (message.tool_result) {
    try {
      displayResult = JSON.stringify(JSON.parse(message.tool_result), null, 2);
    } catch {
      displayResult = message.tool_result;
    }
  }

  return (
    <div className="flex gap-3 max-w-3xl">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isError ? 'bg-red-100' : 'bg-green-100'
        }`}
      >
        {isError ? (
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`rounded-xl px-4 py-2.5 text-sm border ${
            isError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isError ? 'text-red-800' : 'text-green-800'}`}>
              {isError ? 'Error' : 'Result'}: {message.tool_name}
            </span>
          </div>

          {displayResult && (
            <button
              onClick={() => setExpanded(!expanded)}
              className={`mt-1.5 text-xs flex items-center gap-1 ${
                isError ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
              }`}
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
              {expanded ? 'Hide' : 'Show'} result
            </button>
          )}

          {expanded && displayResult && (
            <pre className="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto">
              {displayResult}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
