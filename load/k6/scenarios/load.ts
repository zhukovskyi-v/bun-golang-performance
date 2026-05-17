import type { Options } from 'k6/options';
import { GLOBAL_TAGS, SETUP_TIMEOUT, THRESHOLDS, USER_POOL_SIZE } from '../config';
import type { User } from '../lib/data';
import { dispatch } from '../lib/dispatch';
import { seedUsers } from '../lib/flows';
import { buildSummary } from '../lib/summary';

const TARGET_RPS = 5;
const WARMUP_RPS = 1;

export const options: Options = {
  scenarios: {
    load: {
      executor: 'ramping-arrival-rate',
      startRate: WARMUP_RPS,
      timeUnit: '1s',
      preAllocatedVUs: 10,
      maxVUs: 30,
      stages: [
        { target: WARMUP_RPS, duration: '30s' },
        { target: TARGET_RPS, duration: '30s' },
        { target: TARGET_RPS, duration: '10m' },
      ],
      tags: { scenario: 'load' },
    },
  },
  thresholds: THRESHOLDS,
  tags: GLOBAL_TAGS,
  setupTimeout: SETUP_TIMEOUT,
  discardResponseBodies: false,
};

export const setup = (): User[] => seedUsers(USER_POOL_SIZE, 'load');

export default (pool: User[]): void => {
  dispatch(pool);
};

export const handleSummary = buildSummary('load');
