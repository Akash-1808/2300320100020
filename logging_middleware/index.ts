import axios from 'axios';
type Stack = 'backend' | 'frontend';
type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type PackageName =
  | 'cache'
  | 'controller'
  | 'cron_job'
  | 'db'
  | 'domain'
  | 'handler'
  | 'repository'
  | 'route'
  | 'service'
  | 'api'
  | 'component'
  | 'hook'
  | 'page'
  | 'state'
  | 'style'
  | 'auth'
  | 'config'
  | 'middleware'
  | 'utils';

type LogProps = {
  stack: Stack;
  level: Level;
  Package: PackageName;
  message: string;
  token?: string;
  meta?: Record<string, unknown>;
};

const stackPackages: Record<Stack, readonly PackageName[]> = {
  backend: ['cache', 'controller', 'cron_job', 'db', 'domain', 'auth', 'config', 'middleware', 'utils'],
  frontend: ['handler', 'repository', 'route', 'service', 'api', 'component', 'hook', 'page', 'state', 'style', 'auth', 'config', 'middleware', 'utils'],
};

const Log = async({ stack, level, Package, message, token, meta }: LogProps) => {
  if (!stackPackages[stack].includes(Package)) {
    throw new Error(`Package "${Package}" is not allowed in ${stack} logs.`);
  }

  await axios.post('http://4.224.186.213/evaluation-service/logs', {
    stack,
    level,
    package: Package,
    message,
    meta: meta ?? {},
  }, {
    headers: token ? {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    } : {
      'Content-Type': 'application/json',
    }
  });
};

export type { LogProps, Level, PackageName, Stack };
export default Log;