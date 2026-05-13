import { Router, Request, Response } from 'express';
import { ConvertService } from '../../application/services/convert.service';

export const convertRouter = Router();
const svc = new ConvertService();

// POST /api/convert/json-to-swagger
convertRouter.post('/json-to-swagger', async (req: Request, res: Response) => {
  try {
    const result = await svc.jsonToSwagger(req.body);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Conversion failed';
    res.status(400).json({ success: false, error: msg });
  }
});

// POST /api/convert/swagger-to-json
convertRouter.post('/swagger-to-json', async (req: Request, res: Response) => {
  try {
    const result = await svc.swaggerToJson(req.body);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Conversion failed';
    res.status(400).json({ success: false, error: msg });
  }
});
