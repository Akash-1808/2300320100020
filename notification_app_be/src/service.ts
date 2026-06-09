type NotificationType = 'Placement' | 'Result' | 'Event' | string;

export type Notification = {
  ID: string;
  Type: NotificationType;
  Message: string;
  Timestamp: string;
};

type InboxItem = Notification & { score: number; createdAtMs: number };

const TYPE_WEIGHT: Record<string, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

const getScore = (notification: Notification): number => {
  const weight = TYPE_WEIGHT[notification.Type] ?? 0;
  const createdAtMs = Date.parse(notification.Timestamp);
  const recencyScore = Number.isNaN(createdAtMs) ? 0 : createdAtMs / 1_000_000_000_000;

  return weight * 1_000_000_000 + recencyScore;
};

class MinHeap {
  private items: InboxItem[] = [];

  constructor(private readonly capacity: number) {}

  private isWorse(left: InboxItem, right: InboxItem): boolean {
    if (left.score !== right.score) {
      return left.score < right.score;
    }

    return left.createdAtMs < right.createdAtMs;
  }

  private swap(leftIndex: number, rightIndex: number): void {
    const temp = this.items[leftIndex];
    this.items[leftIndex] = this.items[rightIndex];
    this.items[rightIndex] = temp;
  }

  private bubbleUp(index: number): void {
    let currentIndex = index;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);

      if (!this.isWorse(this.items[currentIndex], this.items[parentIndex])) {
        break;
      }

      this.swap(currentIndex, parentIndex);
      currentIndex = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    let currentIndex = index;

    while (true) {
      const leftIndex = currentIndex * 2 + 1;
      const rightIndex = currentIndex * 2 + 2;
      let worstIndex = currentIndex;

      if (leftIndex < this.items.length && this.isWorse(this.items[leftIndex], this.items[worstIndex])) {
        worstIndex = leftIndex;
      }

      if (rightIndex < this.items.length && this.isWorse(this.items[rightIndex], this.items[worstIndex])) {
        worstIndex = rightIndex;
      }

      if (worstIndex === currentIndex) {
        break;
      }

      this.swap(currentIndex, worstIndex);
      currentIndex = worstIndex;
    }
  }

  push(notification: Notification): void {
    const createdAtMs = Date.parse(notification.Timestamp);
    const item: InboxItem = {
      ...notification,
      createdAtMs: Number.isNaN(createdAtMs) ? 0 : createdAtMs,
      score: getScore(notification),
    };

    if (this.items.length < this.capacity) {
      this.items.push(item);
      this.bubbleUp(this.items.length - 1);
      return;
    }

    if (!this.isWorse(this.items[0], item)) {
      return;
    }

    this.items[0] = item;
    this.bubbleDown(0);
  }

  toSortedArray(): Notification[] {
    return [...this.items]
      .sort((left, right) => {
        if (left.score !== right.score) {
          return right.score - left.score;
        }

        return right.createdAtMs - left.createdAtMs;
      })
      .map(({ score: _score, createdAtMs: _createdAtMs, ...notification }) => notification);
  }
}

export class PriorityInbox {
  private readonly heap: MinHeap;

  constructor(private readonly limit: number = 10) {
    this.heap = new MinHeap(limit);
  }

  add(notification: Notification): void {
    this.heap.push(notification);
  }

  addMany(notifications: Notification[]): void {
    for (const notification of notifications) {
      this.add(notification);
    }
  }

  top(): Notification[] {
    return this.heap.toSortedArray();
  }
}

export const fetchNotifications = async (apiUrl: string, authToken: string): Promise<Notification[]> => {
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as { notifications?: Notification[]; data?: { notifications?: Notification[] } } | Notification[];

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.notifications)) {
    return payload.notifications;
  }

  if (Array.isArray(payload.data?.notifications)) {
    return payload.data.notifications;
  }

  return [];
};

export const formatNotifications = (notifications: Notification[]): string => {
  return notifications
    .map((notification, index) => {
      return `${index + 1}. [${notification.Type}] ${notification.Message} (${notification.Timestamp})`;
    })
    .join('\n');
};

const demoNotifications: Notification[] = [
  { ID: '1', Type: 'Event', Message: 'farewell', Timestamp: '2026-04-22 17:51:06' },
  { ID: '2', Type: 'Result', Message: 'mid-sem', Timestamp: '2026-04-22 17:50:54' },
  { ID: '3', Type: 'Result', Message: 'project-review', Timestamp: '2026-04-22 17:50:42' },
  { ID: '4', Type: 'Result', Message: 'external', Timestamp: '2026-04-22 17:50:30' },
  { ID: '5', Type: 'Result', Message: 'project-review', Timestamp: '2026-04-22 17:50:18' },
  { ID: '6', Type: 'Event', Message: 'tech-fest', Timestamp: '2026-04-22 17:50:06' },
  { ID: '7', Type: 'Placement', Message: 'CSX Corporation hiring', Timestamp: '2026-04-22 17:51:18' },
  { ID: '8', Type: 'Placement', Message: 'Amazon hiring', Timestamp: '2026-04-22 17:49:59' },
  { ID: '9', Type: 'Event', Message: 'club-meet', Timestamp: '2026-04-22 17:49:40' },
  { ID: '10', Type: 'Result', Message: 'quiz-results', Timestamp: '2026-04-22 17:49:20' },
  { ID: '11', Type: 'Placement', Message: 'Microsoft hiring', Timestamp: '2026-04-22 17:49:10' },
  { ID: '12', Type: 'Event', Message: 'sports-day', Timestamp: '2026-04-22 17:49:00' },
];

const run = async (): Promise<void> => {
  const isDemo = process.argv.includes('--demo');

  const inbox = new PriorityInbox(10);

  if (isDemo) {
    inbox.addMany(demoNotifications);
    console.log('Top 10 priority notifications (demo):');
    console.log(formatNotifications(inbox.top()));
    return;
  }

  const apiUrl = process.env.NOTIFICATION_API_URL ?? 'http://4.224.186.213/evaluation-service/notifications';
  const authToken = process.env.AUTH_TOKEN;

  if (!authToken) {
    throw new Error('Missing AUTH_TOKEN environment variable.');
  }

  const notifications = await fetchNotifications(apiUrl, authToken);
  inbox.addMany(notifications);

  console.log('Top 10 priority notifications:');
  console.log(formatNotifications(inbox.top()));
};

const shouldRun = process.argv.includes('--demo') || Boolean(process.argv[1]?.includes('stage6'));

if (shouldRun) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
