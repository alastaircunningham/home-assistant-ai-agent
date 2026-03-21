import type { Conversation, Message, Settings, ConfirmationPolicy } from './types';

let _basePath = '';

export function setBasePath(path: string) {
  _basePath = path.replace(/\/+$/, '');
}

export function getBasePath(): string {
  return _basePath;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${_basePath}${path}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export function fetchConversations(): Promise<Conversation[]> {
  return api.get<Conversation[]>('/api/conversations');
}

export function createConversation(title?: string): Promise<Conversation> {
  return api.post<Conversation>('/api/conversations', { title: title || 'New Chat' });
}

export function fetchConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] }> {
  return api.get<{ conversation: Conversation; messages: Message[] }>(`/api/conversations/${id}`);
}

export function deleteConversation(id: string): Promise<void> {
  return api.delete<void>(`/api/conversations/${id}`);
}

export function updateConversationTitle(id: string, title: string): Promise<Conversation> {
  return api.put<Conversation>(`/api/conversations/${id}`, { title });
}

export function sendMessage(conversationId: string, content: string): Promise<void> {
  return api.post<void>(`/api/conversations/${conversationId}/messages`, { content });
}

export function fetchSettings(): Promise<Settings> {
  return api.get<Settings>('/api/settings');
}

export function updateSettings(settings: Settings): Promise<Settings> {
  return api.put<Settings>('/api/settings', settings);
}

export function fetchConfirmationPolicies(): Promise<ConfirmationPolicy[]> {
  return api.get<ConfirmationPolicy[]>('/api/confirmation-policies');
}

export function updateConfirmationPolicy(policy: ConfirmationPolicy): Promise<ConfirmationPolicy> {
  return api.put<ConfirmationPolicy>(`/api/confirmation-policies/${policy.tool_name}`, policy);
}
