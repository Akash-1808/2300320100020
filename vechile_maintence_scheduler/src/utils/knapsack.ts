import type { VehicleTask } from '../types.ts';

export type KnapsackResult = {
  totalDuration: number;
  totalImpact: number;
  selectedTasks: VehicleTask[];
};

export const solveKnapsack = (tasks: VehicleTask[], maxHours: number): KnapsackResult => {
  const taskCount = tasks.length;
  const dp = Array.from({ length: taskCount + 1 }, () => new Array<number>(maxHours + 1).fill(0));
  const take = Array.from({ length: taskCount + 1 }, () => new Array<boolean>(maxHours + 1).fill(false));

  for (let taskIndex = 1; taskIndex <= taskCount; taskIndex += 1) {
    const task = tasks[taskIndex - 1];

    for (let hours = 0; hours <= maxHours; hours += 1) {
      dp[taskIndex][hours] = dp[taskIndex - 1][hours];

      if (task.Duration <= hours) {
        const candidate = dp[taskIndex - 1][hours - task.Duration] + task.Impact;

        if (candidate > dp[taskIndex][hours]) {
          dp[taskIndex][hours] = candidate;
          take[taskIndex][hours] = true;
        }
      }
    }
  }

  const selectedTasks: VehicleTask[] = [];
  let hours = maxHours;

  for (let taskIndex = taskCount; taskIndex >= 1; taskIndex -= 1) {
    if (take[taskIndex][hours]) {
      const task = tasks[taskIndex - 1];
      selectedTasks.push(task);
      hours -= task.Duration;
    }
  }

  selectedTasks.reverse();

  return {
    totalDuration: selectedTasks.reduce((sum, task) => sum + task.Duration, 0),
    totalImpact: selectedTasks.reduce((sum, task) => sum + task.Impact, 0),
    selectedTasks,
  };
};
