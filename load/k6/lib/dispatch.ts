import { FLOW_WEIGHTS } from '../config';
import { type User, pickRandom } from './data';
import { newUserFlow, returningUserFlow, tokenVerifyOnlyFlow } from './flows';

export const dispatch = (pool: User[]): void => {
  const r = Math.random();
  if (r < FLOW_WEIGHTS.newUser) {
    newUserFlow();
    return;
  }
  if (r < FLOW_WEIGHTS.newUser + FLOW_WEIGHTS.returningUser) {
    returningUserFlow(pickRandom(pool));
    return;
  }
  tokenVerifyOnlyFlow(pickRandom(pool));
};
