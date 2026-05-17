import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

const params = {
  algorithm: 2,
  timeCost: 2,
  memoryCost: 65536,
  parallelism: 2,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return argonHash(plain, params);
}

export function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  return argonVerify(hashed, plain, params);
}
