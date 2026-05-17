import { verifyAccessToken } from '../auth/jwt';

export type VerifyTokenInput = { access_token: string };
export type VerifyTokenOutput =
  | { valid: true; user_id: string; exp: number }
  | { valid: false; user_id: null; exp: null };

export function verifyTokenQuery() {
  return async (input: VerifyTokenInput): Promise<VerifyTokenOutput> => {
    const claims = await verifyAccessToken(input.access_token);
    if (!claims) return { valid: false, user_id: null, exp: null };
    return { valid: true, user_id: claims.sub, exp: claims.exp };
  };
}
