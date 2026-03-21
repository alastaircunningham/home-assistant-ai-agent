import { useState, useEffect, useCallback } from 'react';
import type { ConfirmationRequest } from '../../lib/types';

interface ConfirmationCardProps {
  request: ConfirmationRequest;
  onRespond: (id: string, approved: boolean) => void;
}

export default function ConfirmationCard({ request, onRespond }: ConfirmationCardProps) {
  const [secondsLeft, setSecondsLeft] = useState(request.timeout_seconds);
  const [responded, setResponded] = useState(false);

  useEffect(() => {
    if (responded || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [responded, secondsLeft]);

  // Auto-deny on timeout so the backend can continue the conversation
  useEffect(() => {
    if (secondsLeft <= 0 && !responded) {
      setResponded(true);
      onRespond(request.id, false);
    }
  }, [secondsLeft, responded, request.id, onRespond]);

  const handleRespond = useCallback(
    (approved: boolean) => {
      if (responded || secondsLeft <= 0) return;
      setResponded(true);
      onRespond(request.id, approved);
    },
    [responded, secondsLeft, request.id, onRespond],
  );

  const isDisabled = responded || secondsLeft <= 0;

  let parsedInput: string | null = null;
  try {
    parsedInput = typeof request.tool_input === 'string'
      ? JSON.stringify(JSON.parse(request.tool_input), null, 2)
      : JSON.stringify(request.tool_input, null, 2);
  } catch {
    parsedInput = String(request.tool_input);
  }

  return (
    <div
      className={`max-w-3xl rounded-xl border-2 p-4 transition-opacity ${
        isDisabled ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-amber-300 bg-amber-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">Confirmation Required</h3>
          <p className="text-sm text-slate-600 mt-1">{request.description}</p>

          <div className="mt-2 text-xs">
            <span className="font-medium text-slate-700">Tool:</span>{' '}
            <span className="text-amber-700 font-mono">{request.tool_name}</span>
          </div>

          {parsedInput && (
            <pre className="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto max-h-40 overflow-y-auto">
              {parsedInput}
            </pre>
          )}

          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => handleRespond(true)}
              disabled={isDisabled}
              className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleRespond(false)}
              disabled={isDisabled}
              className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Deny
            </button>
            {!isDisabled && (
              <span className="text-xs text-slate-500 ml-auto">
                {secondsLeft}s remaining
              </span>
            )}
            {isDisabled && responded && (
              <span className="text-xs text-slate-500 ml-auto">Responded</span>
            )}
            {isDisabled && !responded && (
              <span className="text-xs text-red-500 ml-auto">Timed out</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
