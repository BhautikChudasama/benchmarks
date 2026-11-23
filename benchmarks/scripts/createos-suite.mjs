// The workflow copies this entry point into the pinned ComputeSDK checkout so
// its imports resolve against the same SDK versions as the workloads.
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const suites = [
  'tti', 'dax', 'oci-tti', 'sandbox-burst-survival', 'sandbox-soak',
  'cpu', 'sandbox-cpu-burst', 'sandbox-fs-api', 'sandbox-fs-io',
  'filesystem-snapshot', 'sandbox-snapshot', 'sandbox-snapshot-fanout',
  'sandbox-pause-resume', 'rootfs', 'volumes', 'os-capabilities',
  'sandbox-ci-capabilities', 'sandbox-fidelity',
];

const [mode, selection] = process.argv.slice(2);
const selected = selection === 'all' ? suites : suites.filter(name => name === selection);
if (!selected.length) throw new Error('Unknown sandbox benchmark');

if (mode === 'matrix') {
  console.log(JSON.stringify(selected));
} else if (mode === 'run' && selection !== 'all') {
  if (!process.env.CREATEOS_SANDBOX_API_KEY) throw new Error('Missing CREATEOS_SANDBOX_API_KEY');
  const directory = ['tti', 'dax'].includes(selection) ? 'sandbox' : 'stealth/sandbox';
  const file = resolve('benchmarks', directory, selection + '.bench.ts');
  const args = ['--provider', 'createos', '--no-ingest'];
  if (selection === 'tti') args.push('--iterations', '100', '--concurrency', '100');
  if (selection === 'dax') args.push('--iterations', '1');

  const sdk = await import('@benchsdk/runner');
  const suite = await import(pathToFileURL(file).href);
  const { config } = suite;
  try {
    const result = await sdk.runBenchmark(config, suite.task, args);
    const spec = config.onScore
      ? await config.onScore(sdk.lowerIsBetter, sdk.higherIsBetter)
      : sdk.scoringConfigToSpec(config.scoring, config.dimensions, config.display);
    const rows = sdk.score(result, spec, config.display?.metrics);
    if (!rows.length) throw new Error('Benchmark produced no score rows');
    for (const row of rows) {
      if (row.provider !== 'createos') throw new Error('Unexpected participant ' + row.provider);
      const dimensions = JSON.stringify(row.dimensions);
      const score = row.skipped ? 'Skipped' : row.compositeScore.toFixed(2);
      const success = row.skipped ? '—' : (100 * row.successRate).toFixed(1) + '%';
      const line = '| ' + [selection, dimensions, score, success].join(' | ') + ' |';
      console.log(line);
      appendFileSync(process.env.SCORE_FILE, line + '\n');
    }
  } finally {
    await suite.beforeExit?.();
  }
} else {
  throw new Error('Expected matrix <suite|all> or run <suite>');
}
