import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

type SummaryData = Record<string, unknown>;

export const buildSummary = (
  scenario: string,
): ((data: SummaryData) => Record<string, string>) => {
  return (data: SummaryData) => {
    const out: Record<string, string> = {
      stdout: textSummary(data),
      'summary.json': JSON.stringify(data, null, 2),
    };
    try {
      out[`summary-${scenario}.html`] = htmlReport(data) as string;
    } catch (err) {
      console.error(`htmlReport failed: ${String(err)}`);
    }
    return out;
  };
};

const textSummary = (data: SummaryData): string => {
  const metrics = (data.metrics ?? {}) as Record<string, unknown>;
  const lines: string[] = ['', '=== k6 summary ==='];
  for (const name of Object.keys(metrics).sort()) {
    const m = metrics[name] as { values?: Record<string, number>; type?: string } | undefined;
    if (!m?.values) continue;
    const vals = Object.entries(m.values)
      .map(([k, v]) => `${k}=${v.toFixed(2)}`)
      .join(' ');
    lines.push(`  ${name}: ${vals}`);
  }
  lines.push('');
  return lines.join('\n');
};
