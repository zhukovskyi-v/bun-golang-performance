const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain, { algorithm: 'bcrypt', cost: ROUNDS });
}

export function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  return Bun.password.verify(plain, hashed, 'bcrypt');
}