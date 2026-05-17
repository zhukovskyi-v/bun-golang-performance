import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = import.meta.dir;
const SRC_DIR = join(ROOT, 'scenarios');
const OUT_DIR = join(ROOT, 'dist');

const SCENARIOS = ['smoke', 'load', 'stress', 'soak'] as const;
type Scenario = (typeof SCENARIOS)[number];

const argv = process.argv.slice(2);
const target = argv[0];
const targets: Scenario[] = target
  ? SCENARIOS.includes(target as Scenario)
    ? [target as Scenario]
    : (() => {
        console.error(`unknown scenario: ${target}. valid: ${SCENARIOS.join(', ')}`);
        process.exit(1);
      })()
  : [...SCENARIOS];

if (!target) {
  await rm(OUT_DIR, { recursive: true, force: true });
}

const result = await Bun.build({
  entrypoints: targets.map((s) => join(SRC_DIR, `${s}.ts`)),
  outdir: OUT_DIR,
  target: 'node',
  format: 'esm',
  external: ['k6', 'k6/*', 'https://*'],
  minify: false,
  sourcemap: 'none',
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log(`built ${targets.length} scenario(s): ${targets.join(', ')}`);
