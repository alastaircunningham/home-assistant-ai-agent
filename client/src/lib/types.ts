export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool_use' | 'tool_result';
  content: string | null;
  tool_name: string | null;
  tool_input: string | null;
  tool_result: string | null;
  created_at: string;
  seq: number;
}

export interface Settings {
  api_key?: string;
  model?: string;
  system_prompt?: string;
  max_tokens?: string;
  temperature?: string;
}

export interface ConfirmationPolicy {
  tool_name: string;
  policy: 'always_confirm' | 'auto_approve' | 'auto_deny';
}

export interface WSMessage {
  type: string;
  [key: string]: any;
}

export interface ConfirmationRequest {
  id: string;
  tool_name: string;
  tool_input: any;
  description: string;
  timeout_seconds: number;
}
