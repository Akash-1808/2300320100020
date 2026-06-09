export const config = {
  port: Number(process.env.PORT ?? 3001),
  depotsUrl: process.env.DEPOTS_URL ?? 'http://4.224.186.213/evaluation-service/depots',
  vehiclesUrl: process.env.VEHICLES_URL ?? 'http://4.224.186.213/evaluation-service/vehicles',
  loggingToken: process.env.LOGGING_TOKEN ?? '',
};