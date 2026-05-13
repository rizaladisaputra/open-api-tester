import express from 'express';
import cors from 'cors';
import { convertRouter } from './presentation/routes/convert.routes';
import { validateRouter } from './presentation/routes/validate.routes';
import { formatRouter } from './presentation/routes/format.routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/convert', convertRouter);
app.use('/api/validate', validateRouter);
app.use('/api/format', formatRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Modern API Studio server running on http://localhost:${PORT}`);
});

export default app;
