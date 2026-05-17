import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const headers = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

export const sdk = new NodeSDK({
  serviceName: 'hono-idp',
  traceExporter: endpoint
    ? new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces`, headers })
    : undefined,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

if (endpoint) {
  try {
    sdk.start();
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', msg: 'otel start failed', err: String(err) }));
  }
}

function parseHeaders(raw: string | undefined): Record<string, string> | undefined {
  if (!raw) return undefined;
  const out: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const k = pair.slice(0, idx).trim();
    const v = decodeURIComponent(pair.slice(idx + 1).trim());
    if (k) out[k] = v;
  }
  return out;
}
