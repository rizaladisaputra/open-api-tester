import { FormatRequest, FormatResult } from '@modern-api-studio/types';
import yaml from 'js-yaml';

export class FormatService {
  format(req: FormatRequest): FormatResult {
    if (!req.content) throw new Error('Missing required field: content');

    if (req.type === 'json') {
      const parsed = JSON.parse(req.content);
      return { output: JSON.stringify(parsed, null, 2) };
    } else {
      const parsed = yaml.load(req.content);
      return { output: yaml.dump(parsed, { indent: 2, lineWidth: 120 }) };
    }
  }
}
