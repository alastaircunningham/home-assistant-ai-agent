import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  execute: (input: any, context: ToolContext) => Promise<ToolResult>;
  category: 'device-control' | 'automation' | 'system' | 'smart' | 'config';
  confirmationDefault: 'always_confirm' | 'auto_approve';
}

export interface ToolContext {
  hassClient: HassClient;
  configDir: string;
}

export interface ToolResult {
  success: boolean;
  result: any;
  error?: string;
}

export interface HassClient {
  callService(domain: string, service: string, data?: any, target?: any): Promise<any>;
  getStates(): Promise<any[]>;
  getState(entityId: string): Promise<any>;
  getDevices(): Promise<any[]>;
  getAreas(): Promise<any[]>;
  getEntities(): Promise<any[]>;
  getHistory(entityId: string, startTime: string, endTime?: string): Promise<any>;
  fireEvent(eventType: string, eventData?: any): Promise<any>;
  searchEntities(query: string): Promise<any[]>;
  getServices(): Promise<any>;
  sendNotification(message: string, title?: string, target?: string): Promise<any>;
  getAutomations(): Promise<any[]>;
  triggerAutomation(entityId: string): Promise<any>;
  getScenes(): Promise<any[]>;
  activateScene(entityId: string): Promise<any>;
  getAddons(): Promise<any[]>;
  callApi(method: string, path: string, data?: any): Promise<any>;
}
