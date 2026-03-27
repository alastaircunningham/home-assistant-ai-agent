import { config } from '../config.js';
import { logger } from '../logger.js';
import type { HassClient } from './types.js';

const supervisorBaseUrl = 'http://supervisor/core/api';

function getBaseUrl(): string {
  if (config.supervisorToken) {
    return supervisorBaseUrl;
  }
  // Fallback for development: use HA URL from env or localhost
  return process.env['HA_URL'] ?? 'http://localhost:8123/api';
}

function getHeaders(): Record<string, string> {
  const token = config.supervisorToken || config.anthropicApiKey; // fallback for dev
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function request<T = any>(method: string, url: string, body?: any): Promise<T> {
  const headers = getHeaders();
  const opts: RequestInit = { method, headers };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  logger.debug(`HA API request: ${method} ${url}`);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HA API error ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export function createHassClient(): HassClient {
  const baseUrl = getBaseUrl();

  const client: HassClient = {
    async callService(domain: string, service: string, data?: any, target?: any): Promise<any> {
      const payload: any = { ...data };
      if (target) {
        Object.assign(payload, target);
      }
      return request('POST', `${baseUrl}/services/${domain}/${service}`, payload);
    },

    async getStates(): Promise<any[]> {
      return request('GET', `${baseUrl}/states`);
    },

    async getState(entityId: string): Promise<any> {
      return request('GET', `${baseUrl}/states/${entityId}`);
    },

    async getDevices(): Promise<any[]> {
      // Use template API to get device registry
      const result = await request('POST', `${baseUrl}/template`, {
        template: '{{ devices | list | tojson }}',
      });
      try {
        return JSON.parse(result);
      } catch {
        return [];
      }
    },

    async getAreas(): Promise<any[]> {
      const result = await request('POST', `${baseUrl}/template`, {
        template: '{{ areas() | list | tojson }}',
      });
      try {
        return JSON.parse(result);
      } catch {
        return [];
      }
    },

    async getEntities(): Promise<any[]> {
      // Get all entity IDs via template
      const result = await request('POST', `${baseUrl}/template`, {
        template: '{{ states | map(attribute="entity_id") | list | tojson }}',
      });
      try {
        return JSON.parse(result);
      } catch {
        return [];
      }
    },

    async getHistory(entityId: string, startTime: string, endTime?: string): Promise<any> {
      let url = `${baseUrl}/history/period/${startTime}?filter_entity_id=${entityId}`;
      if (endTime) {
        url += `&end_time=${endTime}`;
      }
      return request('GET', url);
    },

    async fireEvent(eventType: string, eventData?: any): Promise<any> {
      return request('POST', `${baseUrl}/events/${eventType}`, eventData ?? {});
    },

    async searchEntities(query: string): Promise<any[]> {
      const states = await client.getStates();
      const q = query.toLowerCase();
      return states.filter((s: any) => {
        const entityId: string = s.entity_id ?? '';
        const friendlyName: string = s.attributes?.friendly_name ?? '';
        return entityId.toLowerCase().includes(q) || friendlyName.toLowerCase().includes(q);
      });
    },

    async getServices(): Promise<any> {
      return request('GET', `${baseUrl}/services`);
    },

    async sendNotification(message: string, title?: string, _target?: string): Promise<any> {
      return client.callService('notify', 'persistent_notification', {
        message,
        title: title ?? 'AI Agent',
      });
    },

    async getAutomations(): Promise<any[]> {
      const states = await client.getStates();
      return states.filter((s: any) => (s.entity_id as string).startsWith('automation.'));
    },

    async triggerAutomation(entityId: string): Promise<any> {
      return client.callService('automation', 'trigger', {}, { entity_id: entityId });
    },

    async getScenes(): Promise<any[]> {
      const states = await client.getStates();
      return states.filter((s: any) => (s.entity_id as string).startsWith('scene.'));
    },

    async activateScene(entityId: string): Promise<any> {
      return client.callService('scene', 'turn_on', {}, { entity_id: entityId });
    },

    async getAddons(): Promise<any[]> {
      try {
        const result = await request<any>('GET', 'http://supervisor/addons');
        return result?.data?.addons ?? [];
      } catch (err) {
        logger.warn('Failed to get addons (may not be running as add-on)', {
          error: (err as Error).message,
        });
        return [];
      }
    },

    async callApi(method: string, path: string, data?: any): Promise<any> {
      const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
      return request(method, url, data);
    },

    async getConfig(): Promise<any> {
      return request('GET', `${baseUrl}/config`);
    },
  };

  return client;
}
