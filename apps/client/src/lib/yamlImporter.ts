import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import type {
  ApiSpec,
  Endpoint,
  HttpMethod,
  ApiTag,
  SchemaComponent,
  SchemaProperty,
  SecurityScheme,
  EndpointParameter,
  ResponseDefinition,
  ContentType,
} from '@modern-api-studio/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_SCHEMA_TYPES = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'] as const;
type ValidSchemaType = typeof VALID_SCHEMA_TYPES[number];

function toSchemaType(raw: unknown): ValidSchemaType {
  if (VALID_SCHEMA_TYPES.includes(raw as ValidSchemaType)) return raw as ValidSchemaType;
  return 'string';
}

function toSchemaProps(
  properties: Record<string, any> = {},
  required: string[] = [],
): SchemaProperty[] {
  return Object.entries(properties).map(([name, def]) => {
    const prop: SchemaProperty = {
      id: uuidv4(),
      name,
      type: toSchemaType(def.type),
      required: required.includes(name),
      nullable: def.nullable ?? false,
      description: def.description,
      format: def.format,
      example: def.example,
      enum: Array.isArray(def.enum) ? def.enum.map(String) : undefined,
    };

    // Nested object
    if (def.properties) {
      prop.properties = toSchemaProps(def.properties, def.required ?? []);
    }

    // Array items
    if (def.items) {
      prop.items = {
        id: uuidv4(),
        name: 'item',
        type: toSchemaType(def.items.type),
        required: false,
        nullable: false,
      };
    }

    return prop;
  });
}

function parseSchemas(components: Record<string, any> = {}): SchemaComponent[] {
  const schemas = components.schemas ?? {};
  return Object.entries(schemas).map(([name, def]: [string, any]) => ({
    id: uuidv4(),
    name,
    description: def.description,
    properties: toSchemaProps(def.properties ?? {}, def.required ?? []),
  }));
}

function parseSecuritySchemes(
  components: Record<string, any> = {},
): SecurityScheme[] {
  const schemes = components.securitySchemes ?? {};
  return Object.entries(schemes).map(([name, def]: [string, any]) => {
    const base: Pick<SecurityScheme, 'id' | 'name' | 'description'> = {
      id: uuidv4(),
      name,
      description: def.description,
    };

    if (def.type === 'http') {
      if (def.scheme === 'basic') return { ...base, type: 'basic' as const };
      // default http => bearer
      return { ...base, type: 'bearer' as const, bearerFormat: def.bearerFormat };
    }
    if (def.type === 'apiKey') {
      return {
        ...base,
        type: 'apiKey' as const,
        in: (def.in ?? 'header') as 'header' | 'query' | 'cookie',
        keyName: def.name,
      };
    }
    if (def.type === 'oauth2') {
      return { ...base, type: 'oauth2' as const, flows: def.flows };
    }
    // openIdConnect / unknown → treat as bearer
    return { ...base, type: 'bearer' as const };
  });
}

function parseTags(rawTags: any[] = []): ApiTag[] {
  return rawTags.map((t) => ({
    id: uuidv4(),
    name: String(t.name ?? 'Unnamed'),
    description: t.description,
  }));
}

function parseParameters(params: any[] = []): EndpointParameter[] {
  return params
    .filter((p) => p && typeof p === 'object' && !p.$ref)
    .map((p) => ({
      id: uuidv4(),
      name: String(p.name ?? ''),
      in: (p.in ?? 'query') as EndpointParameter['in'],
      required: p.required ?? false,
      description: p.description,
      schema: {
        type: toSchemaType(p.schema?.type),
        format: p.schema?.format,
        example: p.schema?.example,
        enum: Array.isArray(p.schema?.enum)
          ? p.schema.enum.map(String)
          : undefined,
      },
    }));
}

function parseResponses(responses: Record<string, any> = {}): ResponseDefinition[] {
  return Object.entries(responses).map(([code, def]: [string, any]) => ({
    id: uuidv4(),
    statusCode: code,
    description: String(def?.description ?? ''),
    schema: [],
  }));
}

const CONTENT_TYPES: ContentType[] = [
  'application/json',
  'multipart/form-data',
  'application/x-www-form-urlencoded',
];

function toContentType(raw: string): ContentType {
  return (CONTENT_TYPES.find((ct) => raw.startsWith(ct)) ?? 'application/json');
}

function parseRequestBodySchema(requestBody: any): SchemaProperty[] | null {
  if (!requestBody?.content) return null;
  const content = requestBody.content;
  const mediaTypeKey = Object.keys(content)[0];
  if (!mediaTypeKey) return null;
  const schema = content[mediaTypeKey]?.schema;
  if (!schema) return null;
  return toSchemaProps(schema.properties ?? {}, schema.required ?? []);
}

function parseRequestBodyContentType(requestBody: any): ContentType {
  if (!requestBody?.content) return 'application/json';
  const key = Object.keys(requestBody.content)[0] ?? 'application/json';
  return toContentType(key);
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
// include additional OpenAPI methods that aren't in our HttpMethod union
const ALL_METHODS = [...HTTP_METHODS, 'OPTIONS', 'HEAD', 'TRACE'] as const;

function parseEndpoints(
  paths: Record<string, any> = {},
  allTagNames: string[],
): Endpoint[] {
  const endpoints: Endpoint[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    const pathParams = parseParameters(pathItem.parameters ?? []);

    for (const rawMethod of ALL_METHODS) {
      const op = pathItem[rawMethod.toLowerCase()];
      if (!op) continue;

      // Only persist methods our HttpMethod union supports; others get skipped
      const method = rawMethod.toUpperCase() as HttpMethod;
      if (!HTTP_METHODS.includes(method)) continue;

      const opParams = parseParameters(op.parameters ?? []);
      // Merge path-level & op-level params (op wins on name+in conflict)
      const merged: EndpointParameter[] = [
        ...pathParams.filter(
          (pp) => !opParams.find((op2) => op2.name === pp.name && op2.in === pp.in),
        ),
        ...opParams,
      ];

      const securityNames = (op.security ?? []).flatMap(
        (s: Record<string, any>) => Object.keys(s),
      );
      const tagNames = (op.tags ?? []).filter((t: string) =>
        allTagNames.includes(t),
      );

      const bodySchema = parseRequestBodySchema(op.requestBody);

      const ep: Endpoint = {
        id: uuidv4(),
        path,
        method,
        summary: op.summary ?? '',
        description: op.description,
        operationId: op.operationId,
        tags: tagNames,
        deprecated: op.deprecated ?? false,
        security: securityNames,
        parameters: merged,
        requestBody: bodySchema
          ? {
              required: op.requestBody?.required ?? false,
              contentType: parseRequestBodyContentType(op.requestBody),
              schema: bodySchema,
            }
          : undefined,
        responses: parseResponses(op.responses ?? {}),
      };

      endpoints.push(ep);
    }
  }

  return endpoints;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ImportResult {
  spec: ApiSpec;
  warnings: string[];
}

/**
 * Parse an OpenAPI 3.x or Swagger 2.x document (YAML or JSON string)
 * into the internal ApiSpec format used by the store.
 */
export function parseOpenApiToSpec(raw: string): ImportResult {
  const warnings: string[] = [];

  let doc: any;
  try {
    // yaml.load() handles both YAML and JSON
    doc = yaml.load(raw);
  } catch (e) {
    throw new Error(`Failed to parse file: ${(e as Error).message}`);
  }

  if (!doc || typeof doc !== 'object') {
    throw new Error('File does not contain a valid YAML/JSON object.');
  }

  const isSwagger2 = !!doc.swagger;
  if (!doc.openapi && !doc.swagger) {
    warnings.push(
      'No "openapi" or "swagger" version field found — treating as OpenAPI 3.',
    );
  }

  const info = doc.info ?? {};
  const tags = parseTags(doc.tags ?? []);
  const allTagNames = tags.map((t) => t.name);

  // Build servers list
  const servers: ApiSpec['servers'] = [];
  if (isSwagger2) {
    const scheme = (doc.schemes ?? ['https'])[0];
    const host = doc.host ?? 'api.example.com';
    const basePath = doc.basePath ?? '/';
    servers.push({ url: `${scheme}://${host}${basePath}`, description: 'Server' });
  } else {
    for (const s of doc.servers ?? []) {
      servers.push({ url: s.url, description: s.description });
    }
  }
  if (servers.length === 0) {
    servers.push({ url: 'https://api.example.com', description: 'Server' });
  }

  const components = doc.components ?? {};
  const schemas = parseSchemas(components);
  const securitySchemes = parseSecuritySchemes(components);

  // Swagger 2 securityDefinitions
  if (isSwagger2 && doc.securityDefinitions) {
    const sw2 = parseSecuritySchemes({ securitySchemes: doc.securityDefinitions });
    securitySchemes.push(...sw2);
  }

  const globalSecurity = (doc.security ?? []).flatMap(
    (s: Record<string, any>) => Object.keys(s),
  );

  const endpoints = parseEndpoints(doc.paths ?? {}, allTagNames);

  if (endpoints.length === 0) {
    warnings.push('No endpoints (paths) were found in the spec.');
  }

  const spec: ApiSpec = {
    id: uuidv4(),
    info: {
      title: String(info.title ?? 'Imported API'),
      version: String(info.version ?? '1.0.0'),
      description: info.description,
    },
    servers,
    tags,
    endpoints,
    components: { schemas, securitySchemes },
    globalSecurity,
    openApiVersion: isSwagger2 ? 'swagger2' : 'openapi3',
  };

  return { spec, warnings };
}
