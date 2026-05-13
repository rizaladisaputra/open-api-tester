import {
  ConvertJsonToSwaggerRequest,
  ConvertSwaggerToJsonRequest,
  ConversionResult,
} from '@modern-api-studio/types';
import {
  convertJsonToOpenApi3,
  convertJsonToSwagger2,
  convertSpecToJson,
  detectFormat,
} from '@modern-api-studio/utils';

export class ConvertService {
  async jsonToSwagger(req: ConvertJsonToSwaggerRequest): Promise<ConversionResult> {
    if (!req.json) throw new Error('Missing required field: json');

    // Validate input is valid JSON
    try {
      JSON.parse(req.json);
    } catch {
      throw new Error('Invalid JSON format');
    }

    const version = req.targetVersion || 'openapi3';
    const format = req.outputFormat || 'yaml';

    const output =
      version === 'openapi3'
        ? convertJsonToOpenApi3({ ...req, outputFormat: format, targetVersion: version })
        : convertJsonToSwagger2({ ...req, outputFormat: format, targetVersion: version });

    return { output, format, version };
  }

  async swaggerToJson(req: ConvertSwaggerToJsonRequest): Promise<ConversionResult> {
    if (!req.spec) throw new Error('Missing required field: spec');
    const output = convertSpecToJson(req.spec);
    return { output, format: 'json', version: 'openapi3' };
  }
}
