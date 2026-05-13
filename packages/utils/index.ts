import type {
  ApiSpec,
  ConvertJsonToSwaggerRequest,
  SchemaType,
  EndpointParameter,
  HttpMethod,
} from '@modern-api-studio/types';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// JSON → OpenAPI Schema Inference
// ============================================================

export function inferType(value: unknown): SchemaType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'boolean': return 'boolean';
    case 'number': return Number.isInteger(value) ? 'integer' : 'number';
    case 'object': return 'object';
    default: return 'string';
  }
}

export function inferFormat(value: unknown): string | undefined {
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return 'date-time';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    if (/^[0-9a-f-]{36}$/i.test(value)) return 'uuid';
    if (/^https?:\/\//.test(value)) return 'uri';
    if (/^[\w.]+@[\w.]+\.\w+$/.test(value)) return 'email';
  }
  if (typeof value === 'number' && !Number.isInteger(value)) return 'float';
  return undefined;
}

export function jsonToSchema(
  obj: unknown,
  name = 'Schema',
  depth = 0,
): Record<string, unknown> {
  if (obj === null) return { type: 'string', nullable: true };

  if (Array.isArray(obj)) {
    const sample = obj[0] ?? '';
    return {
      type: 'array',
      items: jsonToSchema(sample, name + 'Item', depth + 1),
    };
  }

  if (typeof obj === 'object') {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      properties[key] = jsonToSchema(val, key, depth + 1);
      if (val !== null && val !== undefined) required.push(key);
    }

    return {
      type: 'object',
      properties,
      ...(required.length ? { required } : {}),
    };
  }

  const type = inferType(obj);
  const format = inferFormat(obj);
  const base: Record<string, unknown> = { type, example: obj };
  if (format) base.format = format;
  return base;
}

// ============================================================
// Extract Path Parameters from URL
// ============================================================

export function extractPathParams(path: string): EndpointParameter[] {
  const matches = path.match(/\{([^}]+)\}/g) || [];
  return matches.map((m) => {
    const name = m.replace(/[{}]/g, '');
    return {
      id: uuidv4(),
      name,
      in: 'path' as const,
      required: true,
      description: `The ${name} parameter`,
      schema: { type: 'string' as const },
    };
  });
}

// ============================================================
// Generate Endpoints from JSON body + path/method hints
// ============================================================

function buildEndpointSpec(
  method: HttpMethod,
  path: string,
  body: unknown,
  schemaName: string,
  version: 'openapi3' | 'swagger2',
): Record<string, unknown> {
  const pathParams = extractPathParams(path);
  const parameters: Record<string, unknown>[] = pathParams.map((p) => ({
    name: p.name,
    in: 'path',
    required: true,
    description: p.description,
    schema: { type: 'string' },
  }));

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);

  const operation: Record<string, unknown> = {
    tags: ['default'],
    summary: `${method} ${path}`,
    operationId: `${method.toLowerCase()}${schemaName}`,
    parameters,
    responses: {
      '200': {
        description: 'Success',
        ...(version === 'openapi3'
          ? {
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/${schemaName}` },
                  example: body,
                },
              },
            }
          : {
              schema: { $ref: `#/definitions/${schemaName}` },
              examples: { 'application/json': body },
            }),
      },
      '400': { description: 'Bad Request' },
      '401': { description: 'Unauthorized' },
      '404': { description: 'Not Found' },
      '500': { description: 'Internal Server Error' },
    },
  };

  if (hasBody) {
    if (version === 'openapi3') {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${schemaName}` },
            example: body,
          },
        },
      };
    } else {
      operation.parameters = [
        ...parameters,
        {
          in: 'body',
          name: 'body',
          required: true,
          schema: { $ref: `#/definitions/${schemaName}` },
        },
      ];
    }
  }

  return operation;
}

// ============================================================
// JSON → OpenAPI 3.0 Spec
// ============================================================

export function convertJsonToOpenApi3(
  req: ConvertJsonToSwaggerRequest,
): string {
  const json = JSON.parse(req.json);
  const schemaName = pascalCase(req.title || 'Schema');
  const basePath = req.basePath || '/api/v1/items';
  const baseUrl = req.baseUrl || 'https://api.example.com';

  const schema = jsonToSchema(json, schemaName);

  const resourcePath = basePath.replace(/\/$/, '');
  const idPath = `${resourcePath}/{id}`;

  const paths: Record<string, Record<string, unknown>> = {
    [resourcePath]: {
      get: buildEndpointSpec('GET', resourcePath, Array.isArray(json) ? json : [json], schemaName, 'openapi3'),
      post: buildEndpointSpec('POST', resourcePath, json, schemaName, 'openapi3'),
    },
    [idPath]: {
      get: buildEndpointSpec('GET', idPath, json, schemaName, 'openapi3'),
      put: buildEndpointSpec('PUT', idPath, json, schemaName, 'openapi3'),
      patch: buildEndpointSpec('PATCH', idPath, json, schemaName, 'openapi3'),
      delete: {
        tags: ['default'],
        summary: `Delete ${schemaName}`,
        operationId: `delete${schemaName}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted successfully' },
          '404': { description: 'Not Found' },
        },
      },
    },
  };

  const spec = {
    openapi: '3.0.3',
    info: {
      title: req.title || 'Generated API',
      version: req.version || '1.0.0',
      description: 'Auto-generated by Modern API Studio',
    },
    servers: [{ url: baseUrl, description: 'Main server' }],
    tags: [{ name: 'default', description: 'Default operations' }],
    paths,
    components: {
      schemas: { [schemaName]: schema },
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
      },
    },
  };

  return req.outputFormat === 'yaml'
    ? yaml.dump(spec, { indent: 2, lineWidth: 120 })
    : JSON.stringify(spec, null, 2);
}

// ============================================================
// JSON → Swagger 2.0 Spec
// ============================================================

export function convertJsonToSwagger2(
  req: ConvertJsonToSwaggerRequest,
): string {
  const json = JSON.parse(req.json);
  const schemaName = pascalCase(req.title || 'Schema');
  const basePath = req.basePath || '/api/v1/items';
  const baseUrl = req.baseUrl || 'https://api.example.com';
  const hostUrl = new URL(baseUrl);

  const schema = jsonToSchema(json, schemaName);
  const resourcePath = basePath.replace(/\/$/, '');
  const idPath = `${resourcePath}/{id}`;

  const paths: Record<string, Record<string, unknown>> = {
    [resourcePath]: {
      get: buildEndpointSpec('GET', resourcePath, Array.isArray(json) ? json : [json], schemaName, 'swagger2'),
      post: buildEndpointSpec('POST', resourcePath, json, schemaName, 'swagger2'),
    },
    [idPath]: {
      get: buildEndpointSpec('GET', idPath, json, schemaName, 'swagger2'),
      put: buildEndpointSpec('PUT', idPath, json, schemaName, 'swagger2'),
      patch: buildEndpointSpec('PATCH', idPath, json, schemaName, 'swagger2'),
      delete: {
        tags: ['default'],
        summary: `Delete ${schemaName}`,
        operationId: `delete${schemaName}`,
        parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not Found' } },
      },
    },
  };

  const spec = {
    swagger: '2.0',
    info: { title: req.title || 'Generated API', version: req.version || '1.0.0' },
    host: hostUrl.host,
    basePath: '/',
    schemes: [hostUrl.protocol.replace(':', '')],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [{ name: 'default' }],
    paths,
    definitions: { [schemaName]: schema },
    securityDefinitions: {
      bearerAuth: { type: 'apiKey', name: 'Authorization', in: 'header' },
    },
  };

  return req.outputFormat === 'yaml'
    ? yaml.dump(spec, { indent: 2, lineWidth: 120 })
    : JSON.stringify(spec, null, 2);
}

// ============================================================
// OpenAPI/Swagger → Sample JSON (Mock Generator)
// ============================================================

export function generateMockFromSchema(schema: Record<string, unknown>, definitions?: Record<string, unknown>, depth = 0): unknown {
  if (depth > 10) return null;

  if (schema.$ref && typeof schema.$ref === 'string') {
    const refPath = (schema.$ref as string).split('/').pop()!;
    const resolved =
      (definitions as Record<string, Record<string, unknown>>)?.[refPath];
    if (resolved) return generateMockFromSchema(resolved, definitions, depth + 1);
    return {};
  }

  switch (schema.type) {
    case 'object': {
      const result: Record<string, unknown> = {};
      const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
      if (props) {
        for (const [key, val] of Object.entries(props)) {
          result[key] = generateMockFromSchema(val, definitions, depth + 1);
        }
      }
      return result;
    }
    case 'array': {
      const items = schema.items as Record<string, unknown> | undefined;
      if (items) return [generateMockFromSchema(items, definitions, depth + 1)];
      return [];
    }
    case 'boolean': return schema.example ?? schema.default ?? true;
    case 'integer': return schema.example ?? schema.default ?? 1;
    case 'number': return schema.example ?? schema.default ?? 1.5;
    case 'string': {
      if (schema.example) return schema.example;
      if (schema.default) return schema.default;
      if (schema.enum && Array.isArray(schema.enum)) return schema.enum[0];
      const format = schema.format as string | undefined;
      if (format === 'date-time') return new Date().toISOString();
      if (format === 'date') return new Date().toISOString().split('T')[0];
      if (format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
      if (format === 'email') return 'user@example.com';
      if (format === 'uri') return 'https://example.com';
      return 'string';
    }
    default:
      return schema.example ?? schema.default ?? null;
  }
}

export function convertSpecToJson(specString: string): string {
  let spec: Record<string, unknown>;
  try {
    spec = JSON.parse(specString);
  } catch {
    spec = yaml.load(specString) as Record<string, unknown>;
  }

  // OpenAPI 3
  const components = spec.components as Record<string, unknown> | undefined;
  const schemas = (components?.schemas ?? spec.definitions) as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!schemas) return JSON.stringify({ message: 'No schemas found' }, null, 2);

  const result: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(schemas)) {
    result[name] = generateMockFromSchema(schema, schemas);
  }

  return JSON.stringify(result, null, 2);
}

// ============================================================
// ApiSpec → OpenAPI 3.0 YAML/JSON
// ============================================================

export function apiSpecToOpenApi3(spec: ApiSpec, format: 'json' | 'yaml' = 'yaml'): string {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const ep of spec.endpoints) {
    if (!paths[ep.path]) paths[ep.path] = {};

    const pathParams = ep.parameters.filter((p) => p.in === 'path');
    const queryParams = ep.parameters.filter((p) => p.in === 'query');
    const headerParams = ep.parameters.filter((p) => p.in === 'header');

    const parameters = [...pathParams, ...queryParams, ...headerParams].map((p) => ({
      name: p.name,
      in: p.in,
      required: p.required,
      description: p.description,
      schema: p.schema,
    }));

    const responses: Record<string, unknown> = {};
    for (const r of ep.responses) {
      const responseObj: Record<string, unknown> = { description: r.description };
      if (r.mode === 'raw' && r.rawJson) {
        try {
          responseObj.content = { [r.contentType || 'application/json']: { schema: jsonToSchema(JSON.parse(r.rawJson)) } };
        } catch {
          responseObj.content = { [r.contentType || 'application/json']: { schema: { type: 'object' } } };
        }
      } else if (r.schema && r.schema.length > 0) {
        const schemaObj = buildSchemaFromProperties(r.schema);
        responseObj.content = {
          [r.contentType || 'application/json']: { schema: schemaObj },
        };
      }
      responses[r.statusCode] = responseObj;
    }

    const operation: Record<string, unknown> = {
      tags: ep.tags.length ? ep.tags : ['default'],
      summary: ep.summary || `${ep.method} ${ep.path}`,
      description: ep.description,
      operationId: ep.operationId || `${ep.method.toLowerCase()}${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
      deprecated: ep.deprecated || undefined,
      parameters,
      responses: Object.keys(responses).length ? responses : { '200': { description: 'Success' } },
    };

    if (ep.security && ep.security.length > 0) {
      operation.security = ep.security.map((s) => ({ [s]: [] }));
    }

    if (ep.requestBody && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
      let bodySchema;
      if (ep.requestBody.mode === 'raw' && ep.requestBody.rawJson) {
        try {
          bodySchema = jsonToSchema(JSON.parse(ep.requestBody.rawJson));
        } catch {
          bodySchema = { type: 'object' };
        }
      } else {
        bodySchema = buildSchemaFromProperties(ep.requestBody.schema);
      }
      
      operation.requestBody = {
        required: ep.requestBody.required,
        description: ep.requestBody.description,
        content: { [ep.requestBody.contentType]: { schema: bodySchema } },
      };
    }

    paths[ep.path][ep.method.toLowerCase()] = operation;
  }

  const securitySchemes: Record<string, unknown> = {};
  for (const s of spec.components.securitySchemes) {
    if (s.type === 'bearer') {
      securitySchemes[s.name] = { type: 'http', scheme: 'bearer', bearerFormat: s.bearerFormat || 'JWT' };
    } else if (s.type === 'basic') {
      securitySchemes[s.name] = { type: 'http', scheme: 'basic' };
    } else if (s.type === 'apiKey') {
      securitySchemes[s.name] = { type: 'apiKey', name: s.keyName || 'x-api-key', in: s.in || 'header' };
    } else if (s.type === 'oauth2') {
      securitySchemes[s.name] = { type: 'oauth2', flows: s.flows || {} };
    }
  }

  const schemas: Record<string, unknown> = {};
  for (const comp of spec.components.schemas) {
    schemas[comp.name] = buildSchemaFromProperties(comp.properties);
  }

  const openApiSpec = {
    openapi: '3.0.3',
    info: spec.info,
    servers: spec.servers,
    tags: spec.tags.map((t) => ({ name: t.name, description: t.description })),
    ...(spec.globalSecurity.length > 0
      ? { security: spec.globalSecurity.map((s) => ({ [s]: [] })) }
      : {}),
    paths,
    components: {
      schemas: Object.keys(schemas).length ? schemas : undefined,
      securitySchemes: Object.keys(securitySchemes).length ? securitySchemes : undefined,
    },
  };

  return format === 'yaml'
    ? yaml.dump(openApiSpec, { indent: 2, lineWidth: 120 })
    : JSON.stringify(openApiSpec, null, 2);
}

function buildSchemaFromProperties(props: import('@modern-api-studio/types').SchemaProperty[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const p of props) {
    if (p.ref) {
      properties[p.name] = { $ref: `#/components/schemas/${p.ref}` };
    } else if (p.type === 'object' && p.properties) {
      properties[p.name] = buildSchemaFromProperties(p.properties);
    } else if (p.type === 'array' && p.items) {
      properties[p.name] = {
        type: 'array',
        items: p.items.ref
          ? { $ref: `#/components/schemas/${p.items.ref}` }
          : { type: p.items.type },
      };
    } else {
      const s: Record<string, unknown> = { type: p.type };
      if (p.format) s.format = p.format;
      if (p.description) s.description = p.description;
      if (p.example !== undefined) s.example = p.example;
      if (p.default !== undefined) s.default = p.default;
      if (p.enum) s.enum = p.enum;
      if (p.nullable) s.nullable = true;
      properties[p.name] = s;
    }
    if (p.required) required.push(p.name);
  }

  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
  };
}

// ============================================================
// Helpers
// ============================================================

export function pascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase());
}

export function detectFormat(input: string): 'json' | 'yaml' {
  try {
    JSON.parse(input);
    return 'json';
  } catch {
    return 'yaml';
  }
}

export function prettifyJson(json: string): string {
  return JSON.stringify(JSON.parse(json), null, 2);
}

export function prettifyYaml(yamlStr: string): string {
  const obj = yaml.load(yamlStr);
  return yaml.dump(obj, { indent: 2 });
}

export { yaml };
