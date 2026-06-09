import express from 'express';
import { maintenanceRoutes } from './routes/maintenanceRoutes.ts';

export const createApp = () => {
  const app = express();

  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/v1', maintenanceRoutes);

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Internal server error';

    response.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message,
      },
    });
  });

  return app;
};