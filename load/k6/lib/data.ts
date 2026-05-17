export type User = {
  email: string;
  password: string;
  userId?: string;
};

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const randHex = (n: number): string => {
  let s = '';
  while (s.length < n) s += Math.random().toString(16).slice(2);
  return s.slice(0, n);
};

export const generateEmail = (prefix: string, index: number): string =>
  `${prefix}-${RUN_ID}-${index}-${randHex(6)}@loadtest.local`;

export const generatePassword = (): string => `Pw!${randHex(20)}`;

export const pickRandom = <T>(arr: readonly T[]): T => {
  if (arr.length === 0) throw new Error('pickRandom: empty array');
  return arr[Math.floor(Math.random() * arr.length)];
};
