import type { Message, Settings, ConfirmationPolicy } from './types';

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

export function fetchMessages(): Promise<Message[]> {
  return api.get<Message[]>('/api/chat/messages');
}

export function sendMessage(content: string): Promise<void> {
  return api.post<void>('/api/chat/messages', { content });
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
