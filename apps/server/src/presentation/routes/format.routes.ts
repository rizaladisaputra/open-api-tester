import { Router, Request, Response } from 'express';
import { FormatService } from '../../application/services/format.service';

export const formatRouter = Router();
const svc = new FormatService();

// POST /api/format
formatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const result = svc.format(req.body);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Format failed';
    res.status(400).json({ success: false, error: msg });
  }
});
