import { ValidateRequest, ValidationResult } from '@modern-api-studio/types';
import SwaggerParser from '@apidevtools/swagger-parser';
import yaml from 'js-yaml';

export class ValidateService {
  async validate(req: ValidateRequest): Promise<ValidationResult> {
    if (!req.spec) throw new Error('Missing required field: spec');

    const errors: { path: string; message: string }[] = [];
    const warnings: { path: string; message: string }[] = [];

    let parsed: Record<string, unknown>;
    try {
      try {
        parsed = JSON.parse(req.spec) as Record<string, unknown>;
      } catch {
        parsed = yaml.load(req.spec) as Record<string, unknown>;
      }
    } catch (e) {
      return {
        valid: false,
        errors: [{ path: 'root', message: 'Invalid JSON or YAML format' }],
        warnings: [],
      };
    }

    try {
      await SwaggerParser.validate(parsed as Parameters<typeof SwaggerParser.validate>[0]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid OpenAPI/Swagger schema';
      errors.push({ path: 'root', message: msg });
    }

    // Duplicate endpoint detection
    const seen = new Set<string>();
    const paths = (parsed as { paths?: Record<string, Record<string, unknown>> }).paths || {};
    for (const [path, methods] of Object.entries(paths)) {
      for (const method of Object.keys(methods)) {
        const key = `${method.toUpperCase()} ${path}`;
        if (seen.has(key)) {
          errors.push({ path: `paths.${path}.${method}`, message: `Duplicate endpoint: ${key}` });
        }
        seen.add(key);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
