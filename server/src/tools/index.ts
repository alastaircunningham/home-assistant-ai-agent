// Import all tool modules to trigger registration with the registry.
// Device control tools
import './device-control/lights.js';
import './device-control/climate.js';
import './device-control/media.js';
import './device-control/cover.js';
import './device-control/lock.js';
import './device-control/fan.js';
import './device-control/vacuum.js';
import './device-control/alarm.js';
import './device-control/switch.js';

// Automation tools
import './automation/automation.js';
import './automation/scene.js';

// System tools
import './system/list-devices.js';
import './system/entity-state.js';
import './system/history.js';
import './system/notify.js';
import './system/search.js';
import './system/addon.js';

// Config tools
import './config/config-editor.js';

// Re-export registry functions for convenience
export { getTool, getAllTools, getToolsForClaude, registerTool } from './registry.js';
export type { ToolDefinition, ToolContext, ToolResult, HassClient } from './types.js';
