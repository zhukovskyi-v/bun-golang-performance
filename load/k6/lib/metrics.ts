import { Counter, Trend } from 'k6/metrics';

export const flowNewUserDuration = new Trend('flow_new_user_total_duration', true);
export const flowReturningUserDuration = new Trend('flow_returning_user_total_duration', true);
export const flowVerifyOnlyDuration = new Trend('flow_verify_only_total_duration', true);

export const tokensIssued = new Counter('tokens_issued');
export const tokensVerified = new Counter('tokens_verified');
export const refreshesCompleted = new Counter('refreshes_completed');
