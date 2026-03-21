import { z } from 'zod';
import type { ToolDefinition } from './types.js';

const tools = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition): void {
  tools.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return tools.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(tools.values());
}

/**
 * Convert all registered tools to Claude API format.
 */
export function getToolsForClaude(): Array<{
  name: string;
  description: string;
  input_schema: Record<string, any>;
}> {
  return getAllTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: zodToJsonSchema(tool.inputSchema),
  }));
}

/**
 * Simple Zod-to-JSON-Schema converter that handles the types we use.
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, any> {
  return convertZodType(schema);
}

function convertZodType(schema: z.ZodTypeAny): Record<string, any> {
  const def = (schema as any)._def;
  const description: string | undefined = def.description;

  // Unwrap ZodOptional
  if (def.typeName === 'ZodOptional') {
    const inner = convertZodType(def.innerType);
    if (description) inner.description = description;
    return inner;
  }

  // Unwrap ZodDefault
  if (def.typeName === 'ZodDefault') {
    const inner = convertZodType(def.innerType);
    inner.default = def.defaultValue();
    if (description) inner.description = description;
    return inner;
  }

  let result: Record<string, any>;

  // ZodString
  if (def.typeName === 'ZodString') {
    result = { type: 'string' };
    for (const check of def.checks ?? []) {
      if (check.kind === 'min') result.minLength = check.value;
      if (check.kind === 'max') result.maxLength = check.value;
    }
  }

  // ZodNumber
  else if (def.typeName === 'ZodNumber') {
    result = { type: 'number' };
    for (const check of def.checks ?? []) {
      if (check.kind === 'min') result.minimum = check.value;
      if (check.kind === 'max') result.maximum = check.value;
    }
  }

  // ZodBoolean
  else if (def.typeName === 'ZodBoolean') {
    result = { type: 'boolean' };
  }

  // ZodEnum
  else if (def.typeName === 'ZodEnum') {
    result = { type: 'string', enum: def.values };
  }

  // ZodNativeEnum
  else if (def.typeName === 'ZodNativeEnum') {
    result = { type: 'string', enum: Object.values(def.values) };
  }

  // ZodLiteral
  else if (def.typeName === 'ZodLiteral') {
    result = { type: typeof def.value, const: def.value };
  }

  // ZodArray
  else if (def.typeName === 'ZodArray') {
    result = {
      type: 'array',
      items: convertZodType(def.type),
    };
  }

  // ZodObject
  else if (def.typeName === 'ZodObject') {
    const shape = def.shape();
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convertZodType(value as z.ZodTypeAny);
      // Check if the field is NOT optional
      const fieldDef = (value as any)._def;
      if (fieldDef.typeName !== 'ZodOptional' && fieldDef.typeName !== 'ZodDefault') {
        required.push(key);
      }
    }

    result = {
      type: 'object',
      properties,
    };
    if (required.length > 0) {
      result.required = required;
    }
  }

  // ZodUnion
  else if (def.typeName === 'ZodUnion') {
    result = {
      anyOf: def.options.map((opt: z.ZodTypeAny) => convertZodType(opt)),
    };
  }

  // Fallback
  else {
    result = { type: 'object' };
  }

  if (description) result.description = description;
  return result;
}
