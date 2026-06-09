import { createApp } from './app.ts';
import { config } from './config.ts';

const app = createApp();

app.listen(config.port, () => {
  console.log(`notification_app_be listening on port ${config.port}`);
});