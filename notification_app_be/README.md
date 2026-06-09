# Stage 6 Priority Inbox

This folder contains a small TypeScript app that fetches notifications from the provided API and keeps the top 10 most important unread notifications.

## Run demo mode
```bash
npm install
npm test
```

## Run against the live API
Set the API URL and bearer token, then run:
```bash
set NOTIFICATION_API_URL=http://4.224.186.213/evaluation-service/notifications
set AUTH_TOKEN=your_token_here
npm start
```

## How it stays efficient
- Uses a size-10 min-heap.
- Each new notification is processed in `O(log 10)` time.
- Only the best 10 items are kept in memory.
