import type { Options } from 'k6/options';
import { GLOBAL_TAGS, SETUP_TIMEOUT, THRESHOLDS, USER_POOL_SIZE } from '../config';
import type { User } from '../lib/data';
import { dispatch } from '../lib/dispatch';
import { seedUsers } from '../lib/flows';
import { buildSummary } from '../lib/summary';

const WARMUP_RPS = 50;
const RAMP_START_RPS = 10;
const RAMP_END_RPS = 500;

export const options: Options = {
  scenarios: {
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: WARMUP_RPS,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1500,
      stages: [
        { target: WARMUP_RPS, duration: '30s' },
        { target: RAMP_START_RPS, duration: '15s' },
        { target: RAMP_END_RPS, duration: '15m' },
      ],
      tags: { scenario: 'stress' },
    },
  },
  thresholds: THRESHOLDS,
  tags: GLOBAL_TAGS,
  setupTimeout: SETUP_TIMEOUT,
  discardResponseBodies: false,
};

export const setup = (): User[] => seedUsers(USER_POOL_SIZE, 'stress');

export default (pool: User[]): void => {
  dispatch(pool);
};

export const handleSummary = buildSummary('stress');
