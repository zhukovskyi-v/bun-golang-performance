declare module 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js' {
  export function htmlReport(data: unknown, opts?: { title?: string }): string;
}

declare const console: {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
};
