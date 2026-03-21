import fs from 'node:fs';
import path from 'node:path';

interface HaAddonOptions {
  anthropic_api_key?: string;
  model?: string;
  log_level?: string;
}

export interface Config {
  anthropicApiKey: string;
  model: string;
  logLevel: string;
  port: number;
  supervisorToken: string;
  dataDir: string;
  haConfigDir: string;
}

function loadAddonOptions(dataDir: string): HaAddonOptions {
  const optionsPath = path.join(dataDir, 'options.json');
  try {
    if (fs.existsSync(optionsPath)) {
      const raw = fs.readFileSync(optionsPath, 'utf-8');
      return JSON.parse(raw) as HaAddonOptions;
    }
  } catch {
    // options.json not available — running outside add-on context
  }
  return {};
}

const dataDir = process.env['DATA_DIR'] ?? '/data';
const options = loadAddonOptions(dataDir);

export const config: Config = {
  anthropicApiKey: options.anthropic_api_key ?? process.env['ANTHROPIC_API_KEY'] ?? '',
  model: options.model ?? process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-4-6',
  logLevel: options.log_level ?? process.env['LOG_LEVEL'] ?? 'info',
  port: parseInt(process.env['PORT'] ?? '8099', 10),
  supervisorToken: process.env['SUPERVISOR_TOKEN'] ?? '',
  dataDir,
  haConfigDir: process.env['HA_CONFIG_DIR'] ?? '/homeassistant',
};
