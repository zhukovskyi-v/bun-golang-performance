import type {Options} from 'k6/options';
import {GLOBAL_TAGS, SETUP_TIMEOUT, THRESHOLDS} from '../config';
import type {User} from '../lib/data';
import {dispatch} from '../lib/dispatch';
import {seedUsers} from '../lib/flows';
import {buildSummary} from '../lib/summary';

const SMOKE_POOL_SIZE = 5;
const TARGET_RPS = 12;

export const options: Options = {
    scenarios: {
        smoke: {
            executor: 'constant-arrival-rate',
            rate: TARGET_RPS,
            timeUnit: '1s',
            duration: '1m',
            preAllocatedVUs: 20,
            maxVUs: 50,
            tags: {
                scenario: 'smoke'
            },
        },
    },
    thresholds: THRESHOLDS,
    tags: GLOBAL_TAGS,
    setupTimeout: SETUP_TIMEOUT,
    discardResponseBodies: false,
};

export const setup = (): User[] => seedUsers(SMOKE_POOL_SIZE, 'smoke');

export default (pool: User[]): void => {
    dispatch(pool);
};

export const handleSummary = buildSummary('smoke');
