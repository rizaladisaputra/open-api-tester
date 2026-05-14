// ============================================================
// OpenAPI / Swagger Core Types
// ============================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type OpenApiVersion = 'openapi3' | 'swagger2';
export type OutputFormat = 'json' | 'yaml';
export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie';
export type SchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export type SecuritySchemeType = 'bearer' | 'basic' | 'apiKey' | 'oauth2' | 'none';

// ============================================================
// Schema Definition
// ============================================================

export interface SchemaProperty {
  id: string;
  name: string;
  type: SchemaType;
  format?: string;
  description?: string;
  required: boolean;
  nullable: boolean;
  example?: unknown;
  default?: unknown;
  enum?: string[];
  properties?: SchemaProperty[]; // for nested objects
  items?: SchemaProperty;        // for arrays
  ref?: string;                  // for $ref
}

export interface SchemaComponent {
  id: string;
  name: string;
  description?: string;
  properties: SchemaProperty[];
}

// ============================================================
// Parameters
// ============================================================

export interface EndpointParameter {
  id: string;
  name: string;
  in: ParameterLocation;
  required: boolean;
  description?: string;
  schema: {
    type: SchemaType;
    format?: string;
    example?: unknown;
    enum?: string[];
  };
}

// ============================================================
// Request Body
// ============================================================

export type ContentType =
  | 'application/json'
  | 'multipart/form-data'
  | 'application/x-www-form-urlencoded';

export interface RequestBodyDefinition {
  required: boolean;
  description?: string;
  contentType: ContentType;
  mode?: 'visual' | 'raw' | 'ref';
  rawJson?: string;
  ref?: string;
  schema: SchemaProperty[];
}

// ============================================================
// Response
// ============================================================

export interface ResponseDefinition {
  id: string;
  statusCode: string;
  description: string;
  contentType?: string;
  mode?: 'visual' | 'raw' | 'ref';
  rawJson?: string;
  ref?: string;
  schema?: SchemaProperty[];
  example?: unknown;
  headers?: Record<string, EndpointParameter>;
}

// ============================================================
// Security
// ============================================================

export interface SecurityScheme {
  id: string;
  name: string;
  type: SecuritySchemeType;
  description?: string;
  // Bearer / Basic
  scheme?: string;
  bearerFormat?: string;
  // API Key
  in?: 'header' | 'query' | 'cookie';
  keyName?: string;
  // OAuth2
  flows?: {
    authorizationCode?: { authorizationUrl: string; tokenUrl: string; scopes: Record<string, string> };
    implicit?: { authorizationUrl: string; scopes: Record<string, string> };
    password?: { tokenUrl: string; scopes: Record<string, string> };
    clientCredentials?: { tokenUrl: string; scopes: Record<string, string> };
  };
}

// ============================================================
// Endpoint
// ============================================================

export interface Endpoint {
  id: string;
  path: string;
  method: HttpMethod;
  summary?: string;
  description?: string;
  operationId?: string;
  tags: string[];
  deprecated: boolean;
  security?: string[]; // references to SecurityScheme ids
  parameters: EndpointParameter[];
  requestBody?: RequestBodyDefinition;
  responses: ResponseDefinition[];
}

// ============================================================
// Tag / Group
// ============================================================

export interface ApiTag {
  id: string;
  name: string;
  description?: string;
}

// ============================================================
// Full API Spec (internal app state)
// ============================================================

export interface ApiInfo {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: { name?: string; url?: string; email?: string };
  license?: { name: string; url?: string };
}

export interface ServerDefinition {
  name?: string;
  url: string;
  description?: string;
}

export interface ApiSpec {
  id: string;
  info: ApiInfo;
  servers: ServerDefinition[];
  tags: ApiTag[];
  endpoints: Endpoint[];
  components: {
    schemas: SchemaComponent[];
    securitySchemes: SecurityScheme[];
  };
  globalSecurity: string[];
  openApiVersion: OpenApiVersion;
}

// ============================================================
// Conversion API Payloads
// ============================================================

export interface ConvertJsonToSwaggerRequest {
  json: string;
  targetVersion: OpenApiVersion;
  outputFormat: OutputFormat;
  baseUrl?: string;
  basePath?: string;
  title?: string;
  version?: string;
}

export interface ConvertSwaggerToJsonRequest {
  spec: string; // JSON or YAML OpenAPI/Swagger
}

export interface ValidateRequest {
  spec: string;
}

export interface FormatRequest {
  content: string;
  type: 'json' | 'yaml';
}

// ============================================================
// API Response Wrappers
// ============================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ConversionResult {
  output: string;
  format: OutputFormat;
  version: OpenApiVersion;
}

export interface ValidationResult {
  valid: boolean;
  errors: { path: string; message: string }[];
  warnings: { path: string; message: string }[];
}

export interface FormatResult {
  output: string;
}
