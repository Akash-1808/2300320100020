import Log from '../../../logging_middleware/index.ts';
import { config } from '../config.ts';

const baseLog = async (level: 'debug' | 'info' | 'warn' | 'error' | 'fatal', message: string, meta: Record<string, unknown> = {}) => {
  await Log({
    stack: 'backend',
    level,
    Package: 'service',
    message,
    token: config.loggingToken || undefined,
    meta,
  });
};

export const logInfo = (message: string, meta: Record<string, unknown> = {}) => baseLog('info', message, meta);
export const logWarn = (message: string, meta: Record<string, unknown> = {}) => baseLog('warn', message, meta);
export const logError = (message: string, meta: Record<string, unknown> = {}) => baseLog('error', message, meta);
