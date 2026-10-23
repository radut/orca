import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { build } from 'esbuild'
import { measurePreflightCommand } from './preflight-benchmark-command.mjs'
import { buildCounterbalancedSchedule } from './counterbalanced-benchmark-schedule.mjs'

const root = process.cwd()
const output = resolve('.build/unit-zod-benchmark')
mkdirSync(output, { recursive: true })
const started = performance.now()
await build({
  entryPoints: [fileURLToPath(import.meta.resolve('zod'))],
  outfile: resolve(output, 'zod.mjs'),
  bundle: true, platform: 'node', format: 'esm', target: 'node24', sourcemap: true
})
const bundleMs = performance.now() - started
writeFileSync(resolve(output, 'config.ts'), `
import config from '../../config/vitest.config'
import { resolve } from 'node:path'
const alias = { find: /^zod$/, replacement: resolve('.build/unit-zod-benchmark/zod.mjs') }
const aliases = original => process.env.ORCA_ZOD_SINGLE_BUNDLE === '1' ? [alias, ...original] : original
export default {
  ...config,
  resolve: { ...config.resolve, alias: aliases(config.resolve.alias) },
  test: {
    ...config.test,
    reporters: ['default', 'json', resolve('config/scripts/ci-unit-timing-reporter.mjs')],
    outputFile: { json: process.env.ORCA_ZOD_JSON },
    projects: config.test.projects.map(project => ({ ...project, resolve: { ...project.resolve, alias: aliases(project.resolve.alias) } }))
  }
}
`)
const files = JSON.parse(readFileSync('config/scripts/benchmark-unit-zod-files.json', 'utf8'))
const measurements = []
const report = { sourceSha: process.env.GITHUB_SHA, bundleMs, files, measurements }
const save = () => writeFileSync(resolve(output, 'summary.json'), JSON.stringify(report, null, 2))
const arms = process.env.ORCA_BENCHMARK_ORDER === 'reverse' ? ['bundled', 'baseline'] : ['baseline', 'bundled']
for (const [pair, order] of buildCounterbalancedSchedule(2, ...arms).entries()) {
  for (const arm of order) {
    const label = `${pair}-${arm}`
    const result = await measurePreflightCommand({
      program: process.execPath,
      args: ['config/scripts/run-vitest.mjs', 'run', '--config', resolve(output, 'config.ts'), '--maxWorkers=4', '--isolate', '--retry=0', '--bail=0', ...files],
      label, root, output, timeoutMs: 600_000,
      env: { ...process.env, ORCA_BACKGROUND_LAUNCH: '1', ORCA_BALANCE_UNIT_SHARDS: '1',
        ORCA_ZOD_SINGLE_BUNDLE: arm === 'bundled' ? '1' : '0',
        ORCA_ZOD_JSON: resolve(output, `${label}.json`),
        ORCA_UNIT_TIMING_REPORT: resolve(output, `${label}.timings.json`),
        ORCA_UNIT_PHASE_REPORT: resolve(output, `${label}.phases.json`) }
    })
    writeFileSync(resolve(output, `${label}.log`), `${result.stdout}\n${result.stderr}`)
    measurements.push({ pair, arm, code: result.code, signal: result.signal, timedOut: result.timedOut, durationMs: result.durationMs, peakRssKiB: result.peakRssKiB })
    save()
    console.log(JSON.stringify(measurements.at(-1)))
    if (result.code !== 0 || result.signal || result.timedOut) throw new Error(`Failed ${label}; see logs`)
  }
}
