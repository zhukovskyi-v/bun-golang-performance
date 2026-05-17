# Load testing — k6 suite

k6 scripts that exercise the Go and Bun identity provider services under identical, realistic auth load. Results are pushed to Grafana Cloud via Prometheus remote_write; a side-by-side dashboard JSON lives in `dashboards/comparison.json`.

> **This is the measurement instrument.** The same script targets both services; the only difference between a Go run and a Bun run is two environment variables (`TARGET_URL`, `SERVICE_NAME`). Do not introduce service-specific logic.

## Prerequisites

- **k6 ≥ 1.0** — `brew install k6` on macOS; see <https://grafana.com/docs/k6/latest/set-up/install-k6/> elsewhere.
- **Bun ≥ 1.3** — used to bundle TypeScript scenarios to JS before k6 runs them. (k6's own TS loader requires explicit `.ts` extensions on every import; bundling lets the source stay in the same Node/Bun convention as the rest of the monorepo.)
- One-time setup: `bun install` (devDeps for `@types/k6`, `@types/bun`, `typescript`).
- A Grafana Cloud account with a Prometheus instance and an access token with `metrics:write` scope (for real runs).

## Layout

```
load/k6/
├── config.ts             # env-driven config: TARGET_URL, SERVICE_NAME, thresholds
├── lib/
│   ├── data.ts           # email/password generation
│   ├── checks.ts         # response assertions
│   ├── metrics.ts        # custom Trends + Counters
│   ├── flows.ts          # newUser / returningUser / verifyOnly flows + seedUsers
│   ├── dispatch.ts       # weighted flow picker
│   └── summary.ts        # handleSummary helper (HTML + JSON)
├── scenarios/
│   ├── smoke.ts          # 1 VU, 1 min — sanity
│   ├── load.ts           # 50 RPS, 10 min — steady state
│   ├── stress.ts         # 10 → 500 RPS over 15 min — find the cliff
│   └── soak.ts           # 30 RPS, 60 min — find leaks / drift
├── dashboards/
│   └── comparison.json   # Grafana dashboard, importable as-is
├── build.ts              # bun bundler: scenarios/*.ts → dist/*.js
├── dist/                 # bundled output (gitignored), what k6 actually runs
└── globals.d.ts          # type shim for the k6-reporter URL import
```

## Build step

k6 runs JavaScript, not TypeScript-with-extensionless-imports. `build.ts` uses Bun's bundler to produce `dist/<scenario>.js` per scenario. The `npm`/`bun` scripts below run the bundler then `k6 run dist/<scenario>.js`. You can also build manually:

```bash
bun run build         # bundle all four scenarios
bun run build smoke   # bundle just one
```

`dist/` is gitignored — regenerated on every run.

## Environment variables

| Var | Required | Default | Purpose |
|---|---|---|---|
| `TARGET_URL` | yes (real runs) | `http://localhost:8080` | Base URL of the service under test, no trailing slash. |
| `SERVICE_NAME` | yes | `go` | One of `go` \| `bun`. Tags every request and metric — drives the dashboard split. |
| `USER_POOL_SIZE` | no | `1000` | How many users `setup()` registers before the test starts. |
| `K6_PROMETHEUS_RW_SERVER_URL` | for remote_write | — | Grafana Cloud Prometheus push endpoint. |
| `K6_PROMETHEUS_RW_USERNAME` | for remote_write | — | Grafana Cloud instance ID. |
| `K6_PROMETHEUS_RW_PASSWORD` | for remote_write | — | API token with `metrics:write`. |
| `K6_PROMETHEUS_RW_TREND_STATS` | for remote_write | — | Set to `p(50),p(90),p(95),p(99),min,max,avg`. |

**Never commit credentials.** Use a `.env` (gitignored) or your runner's secret store.

## Running locally — smoke only

Smoke is for verifying the script works end-to-end. Real measurement must happen from a region-matched cloud runner (see below).

Start one service locally, then:

```bash
# vs Go
TARGET_URL=http://localhost:8080 SERVICE_NAME=go bun run smoke

# vs Bun (start Bun on a different port)
TARGET_URL=http://localhost:8081 SERVICE_NAME=bun bun run smoke
```

Each `smoke` / `load` / `stress` / `soak` script rebuilds its bundle then runs k6.

Each run writes `summary-smoke.html` and `summary.json` to the current directory.

## Running real scenarios (against Render)

```bash
# Set Grafana Cloud creds once
export K6_PROMETHEUS_RW_SERVER_URL='https://prometheus-prod-XX-prod-YY.grafana.net/api/prom/push'
export K6_PROMETHEUS_RW_USERNAME='123456'
export K6_PROMETHEUS_RW_PASSWORD='glc_...'
export K6_PROMETHEUS_RW_TREND_STATS='p(50),p(90),p(95),p(99),min,max,avg'

# Pick the service and run
TARGET_URL=https://go-idp.onrender.com  SERVICE_NAME=go  bun run load:remote
TARGET_URL=https://bun-idp.onrender.com SERVICE_NAME=bun bun run load:remote
```

The `*:remote` scripts add `-o experimental-prometheus-rw` so k6 streams metrics to Grafana Cloud while the run is live.

## Running from a region-matched VM (recommended)

Running from a laptop biases the comparison: laptop network jitter dominates the latency you're trying to measure. Either:

- **Grafana Cloud k6** (managed) — paste the `.ts` files in as a single project and run there. It already lives near common cloud regions.
- **Fly.io machine in the same region as your Render service** — minimum Dockerfile:

  ```dockerfile
  FROM grafana/k6:latest
  COPY . /scripts
  WORKDIR /scripts
  ```

  Build, push to `registry.fly.io/<app>`, run with `fly machine run --region <region> --env TARGET_URL=... --env SERVICE_NAME=... ... grafana/k6:latest run scenarios/load.ts`.

## Importing the dashboard

1. In Grafana Cloud → **Dashboards** → **New** → **Import**.
2. Upload `dashboards/comparison.json`.
3. Select your Prometheus datasource when prompted (`DS_PROMETHEUS`).
4. Save.

The dashboard has three template variables — **Service** (`go`/`bun`/`All`), **Scenario** (`smoke`/`load`/`stress`/`soak`/`All`), **Endpoint** — that filter every panel.

## Reading the dashboard

| Row | What "good" looks like | When to investigate |
|---|---|---|
| **1. Request rate & errors** | RPS tracks the scenario's target rate; error rate < 1%. | Error rate spikes, or one service can't reach the target RPS while the other can. |
| **2. Latency per endpoint** | `verify` and `refresh` p95 under 100–150 ms; `login` and `register` dominated by argon2 (~ few hundred ms). | One service's p99 climbing while the other stays flat — usually GC pause (Go) or event loop lag (Bun). |
| **3. Flow durations** | New-user flow ≈ register + login + 5×verify + refresh ≈ ~2× argon2 budget + network. | Flow p99 drifts up over time → memory leak, DB pool exhaustion, or session table growth. |
| **4. App-side metrics** | CPU under plan tier ceiling; RSS stable; Go GC pauses sub-millisecond; Bun event loop lag near zero; DB pool idle ≥ 1 most of the time. | RSS climbing during soak → leak. DB pool pegged at 10 active → bottleneck is the pool, not the runtime. |
| **5. k6 health** | Iterations/s near `rate`; dropped iterations ≈ 0. | Dropped iterations > 0 means k6 itself can't keep up with the configured arrival rate — increase `maxVUs`, or the system under test is saturating and you should believe the latency degradation. |

## The comparison procedure

Run scenarios in this order. **Never run Go and Bun at the same time** from the same k6 instance — the load generator's resource contention will distort both measurements.

1. **Smoke**: Go → wait 5 min → Bun → wait 5 min.
2. **Load**: Go → wait 5 min → Bun → wait 5 min.
3. **Stress**: Go → wait 10 min → Bun → wait 10 min.
4. **Soak** (optional): one service per day; do not run both same-day.

Cooldown matters: Render and Neon stay warm from the previous run for several minutes (DB cache, connection pool, JIT). If you skip the cooldown, the second service gets a colder start and looks slower than it is.

## Thresholds

Defined once in `config.ts` and applied to every scenario. If a threshold is violated, k6 exits non-zero — useful for CI later.

```ts
http_req_failed: ['rate<0.01']
http_req_duration{endpoint:verify}:   ['p(95)<100', 'p(99)<250']
http_req_duration{endpoint:login}:    ['p(95)<500', 'p(99)<1000']  // argon2 dominates
http_req_duration{endpoint:register}: ['p(95)<600', 'p(99)<1200']
http_req_duration{endpoint:refresh}:  ['p(95)<150', 'p(99)<400']
checks: ['rate>0.99']
```

These are starting points — tune after the first real run, keeping them identical across services.

## Custom metrics

- **Trend** (per flow, milliseconds): `flow_new_user_total_duration`, `flow_returning_user_total_duration`, `flow_verify_only_total_duration`.
- **Counter**: `tokens_issued`, `tokens_verified`, `refreshes_completed`.

Every HTTP call is tagged `endpoint={register|login|refresh|verify}`; every run is tagged `service={go|bun}` and `scenario={smoke|load|stress|soak}`. The dashboard relies on these tags — do not strip them.

## Troubleshooting

- **`Cannot find module ... .ts`**: you're on k6 < 0.57. Upgrade.
- **`htmlReport failed`**: k6's URL import was blocked. Run with `--no-thresholds` first to confirm it's only the reporter, then check egress.
- **All thresholds pass but RPS is half the target**: check Row 5's dropped iterations — k6 ran out of VUs. Raise `maxVUs` in the scenario.
- **`go_gc_duration_seconds` empty**: Go service isn't scraping correctly (or `service` label not applied to its scrape job).

## Scope (do / don't)

- ✅ Add new scenarios under `scenarios/` — they all inherit thresholds and tags from `config.ts`.
- ✅ Add new flows under `lib/flows.ts`; wire them into `lib/dispatch.ts`.
- ❌ Do not branch on `SERVICE_NAME` for anything other than tagging — the moment you do, the comparison is biased.
- ❌ Do not commit `users.json` or seeded credentials.
