import bcrypt from 'bcrypt';

const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}