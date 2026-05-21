import type { Options } from 'k6/options';
import { GLOBAL_TAGS, SETUP_TIMEOUT, THRESHOLDS, USER_POOL_SIZE } from '../config';
import type { User } from '../lib/data';
import { dispatch } from '../lib/dispatch';
import { seedUsers } from '../lib/flows';
import { buildSummary } from '../lib/summary';

const TARGET_RPS = 30;

export const options: Options = {
  scenarios: {
    soak: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: '60m',
      preAllocatedVUs: 30,
      maxVUs: 150,
      tags: { scenario: 'soak' },
    },
  },
  thresholds: THRESHOLDS,
  tags: GLOBAL_TAGS,
  setupTimeout: SETUP_TIMEOUT,
  discardResponseBodies: false,
};

export const setup = (): User[] => seedUsers(USER_POOL_SIZE, 'soak');

export default (pool: User[]): void => {
  dispatch(pool);
};

export const handleSummary = buildSummary('soak');
