import axios from 'axios';
import { config } from '../config.ts';
import type { Depot, DepotSchedule, VehicleTask } from '../types.ts';
import { logError, logInfo } from '../utils/logger.ts';
import { solveKnapsack } from '../utils/knapsack.ts';

type ApiListResponse<T> = T[] | { data?: T[] | { items?: T[] } | T[]; items?: T[] };

const unwrapList = <T>(payload: ApiListResponse<T>): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (payload.data && typeof payload.data === 'object' && 'items' in payload.data && Array.isArray(payload.data.items)) {
    return payload.data.items;
  }

  return [];
};

const normalizeDepots = (payload: unknown): Depot[] => unwrapList<Depot>(payload as ApiListResponse<Depot>);
const normalizeTasks = (payload: unknown): VehicleTask[] => unwrapList<VehicleTask>(payload as ApiListResponse<VehicleTask>);

export const buildMaintenanceSchedule = async (): Promise<{ depots: DepotSchedule[]; generatedAt: string }> => {
  await logInfo('Starting maintenance schedule build', {
    depotsUrl: config.depotsUrl,
    vehiclesUrl: config.vehiclesUrl,
  });

  const [depotsResponse, vehiclesResponse] = await Promise.all([
    axios.get(config.depotsUrl),
    axios.get(config.vehiclesUrl),
  ]);

  const depots = normalizeDepots(depotsResponse.data);
  const tasks = normalizeTasks(vehiclesResponse.data);

  await logInfo('Fetched source data', {
    depotCount: depots.length,
    taskCount: tasks.length,
  });

  const depotSchedules: DepotSchedule[] = depots.map((depot) => {
    const result = solveKnapsack(tasks, depot.MechanicHours);

    return {
      depotId: depot.ID,
      mechanicHours: depot.MechanicHours,
      totalDuration: result.totalDuration,
      totalImpact: result.totalImpact,
      selectedTasks: result.selectedTasks,
    };
  });

  await logInfo('Maintenance schedule built successfully', {
    depotCount: depotSchedules.length,
  });

  return {
    depots: depotSchedules,
    generatedAt: new Date().toISOString(),
  };
};

export const safeBuildMaintenanceSchedule = async () => {
  try {
    return await buildMaintenanceSchedule();
  } catch (error) {
    await logError('Maintenance schedule build failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
};