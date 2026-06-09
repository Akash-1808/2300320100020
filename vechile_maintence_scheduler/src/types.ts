export type Depot = {
  ID: number;
  MechanicHours: number;
};

export type VehicleTask = {
  TaskID: string;
  Duration: number;
  Impact: number;
};

export type ScheduledTask = VehicleTask;

export type DepotSchedule = {
  depotId: number;
  mechanicHours: number;
  totalDuration: number;
  totalImpact: number;
  selectedTasks: ScheduledTask[];
};