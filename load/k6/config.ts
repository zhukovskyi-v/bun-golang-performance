const env = (key: string, fallback?: string): string => {
  const v = __ENV[key];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing required env var: ${key}`);
  }
  return v;
};

export const TARGET_URL = env('TARGET_URL', 'http://localhost:8080').replace(/\/$/, '');

export type ServiceName = 'go' | 'bun';
const rawService = env('SERVICE_NAME', 'go');
if (rawService !== 'go' && rawService !== 'bun') {
  throw new Error(`SERVICE_NAME must be "go" or "bun", got: ${rawService}`);
}
export const SERVICE_NAME: ServiceName = rawService;

export const USER_POOL_SIZE = Number(env('USER_POOL_SIZE', '200'));
export const SEED_CONCURRENCY = Number(env('SEED_CONCURRENCY', '10'));
export const SETUP_TIMEOUT = env('SETUP_TIMEOUT', '20m');
export const WARMUP_DURATION = env('WARMUP_DURATION', '30s');
export const WARMUP_RATE_FACTOR = Number(env('WARMUP_RATE_FACTOR', '0.1'));

export const GLOBAL_TAGS = {
  service: SERVICE_NAME,
};

export const THRESHOLDS = {
  http_req_failed: ['rate<0.25'],
  'http_req_duration{endpoint:verify}': ['p(95)<300', 'p(99)<800'],
  'http_req_duration{endpoint:login}': ['p(95)<3500', 'p(99)<6000'],
  'http_req_duration{endpoint:register}': ['p(95)<10000', 'p(99)<15000'],
  'http_req_duration{endpoint:refresh}': ['p(95)<400', 'p(99)<1000'],
  checks: ['rate>0.75'],
};

export const FLOW_WEIGHTS = {
  newUser: 0.30,
  returningUser: 0.60,
  verifyOnly: 0.10,
};

export const HTTP_TIMEOUT = '30s';
