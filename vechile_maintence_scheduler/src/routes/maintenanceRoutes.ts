import { Router } from 'express';
import { safeBuildMaintenanceSchedule } from '../services/maintenanceScheduler.ts';

export const maintenanceRoutes = Router();

maintenanceRoutes.get('/vehicle-maintenance/schedule', async (_request, response, next) => {
  try {
    const result = await safeBuildMaintenanceSchedule();

    response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});