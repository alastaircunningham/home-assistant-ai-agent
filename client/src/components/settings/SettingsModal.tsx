import { useEffect, useState } from 'react';
import type { Settings, ConfirmationPolicy } from '../../lib/types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: Settings;
  policies: ConfirmationPolicy[];
  onSave: (settings: Settings) => void;
  onUpdatePolicy: (policy: ConfirmationPolicy) => void;
  onClose: () => void;
  onLoad: () => void;
}

const MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];

export default function SettingsModal({
  isOpen,
  settings,
  policies,
  onSave,
  onUpdatePolicy,
  onClose,
  onLoad,
}: SettingsModalProps) {
  const [form, setForm] = useState<Settings>({});
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      onLoad();
    }
  }, [isOpen, onLoad]);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={form.api_key || ''}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                placeholder="sk-ant-..."
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Model</label>
            <select
              value={form.model || ''}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select a model...</option>
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">System Prompt</label>
            <textarea
              value={form.system_prompt || ''}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              placeholder="You are a helpful Home Assistant AI agent..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Tokens</label>
            <input
              type="number"
              value={form.max_tokens || ''}
              onChange={(e) => setForm({ ...form, max_tokens: e.target.value })}
              placeholder="4096"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Temperature: {form.temperature || '0.7'}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={form.temperature || '0.7'}
              onChange={(e) => setForm({ ...form, temperature: e.target.value })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Precise (0)</span>
              <span>Creative (1)</span>
            </div>
          </div>

          {/* Confirmation Policies */}
          {policies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tool Confirmation Policies
              </label>
              <div className="space-y-2">
                {policies.map((policy) => (
                  <div
                    key={policy.tool_name}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <span className="text-sm font-mono text-slate-700">{policy.tool_name}</span>
                    <select
                      value={policy.policy}
                      onChange={(e) =>
                        onUpdatePolicy({
                          tool_name: policy.tool_name,
                          policy: e.target.value as ConfirmationPolicy['policy'],
                        })
                      }
                      className="text-xs rounded border border-slate-300 bg-white px-2 py-1 outline-none focus:border-blue-400"
                    >
                      <option value="always_confirm">Always Confirm</option>
                      <option value="auto_approve">Auto Approve</option>
                      <option value="auto_deny">Auto Deny</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
