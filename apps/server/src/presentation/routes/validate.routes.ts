import { Router, Request, Response } from 'express';
import { ValidateService } from '../../application/services/validate.service';

export const validateRouter = Router();
const svc = new ValidateService();

// POST /api/validate
validateRouter.post('/', async (req: Request, res: Response) => {
  try {
    const result = await svc.validate(req.body);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Validation failed';
    res.status(400).json({ success: false, error: msg });
  }
});
