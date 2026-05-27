#!/usr/bin/env node

const targetUrl = process.env.BENCH_URL || 'http://127.0.0.1:3000/members'
const iterations = Number(process.env.BENCH_ITERATIONS || '8')
const warmups = Number(process.env.BENCH_WARMUPS || '2')

const percentile = (values, p) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[index]
}

const formatMs = (value) => `${Math.round(value)}ms`
const formatBytes = (value) => `${Math.round(value / 1024)} KiB`

const requestOnce = async (index, phase) => {
  const startedAt = performance.now()
  const response = await fetch(targetUrl, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'cache-control': 'no-cache',
    },
    redirect: 'follow',
  })
  const body = await response.arrayBuffer()
  const duration = performance.now() - startedAt

  return {
    index,
    phase,
    status: response.status,
    redirected: response.redirected,
    url: response.url,
    duration,
    bytes: body.byteLength,
  }
}

const run = async () => {
  console.info('[bench-members-server] target', targetUrl)

  for (let index = 0; index < warmups; index += 1) {
    const result = await requestOnce(index + 1, 'warmup')
    console.info(
      `[bench-members-server] warmup ${result.index}: ${result.status} ${formatMs(result.duration)} ${formatBytes(result.bytes)}`,
    )
  }

  const results = []
  for (let index = 0; index < iterations; index += 1) {
    const result = await requestOnce(index + 1, 'measure')
    results.push(result)
    console.info(
      `[bench-members-server] run ${result.index}: ${result.status} ${formatMs(result.duration)} ${formatBytes(result.bytes)}`,
    )
  }

  const durations = results.map((result) => result.duration)
  const bytes = results.map((result) => result.bytes)
  const statusCounts = results.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1
    return counts
  }, {})

  console.info('[bench-members-server] summary', {
    iterations,
    statuses: statusCounts,
    duration: {
      min: formatMs(Math.min(...durations)),
      median: formatMs(percentile(durations, 50)),
      p90: formatMs(percentile(durations, 90)),
      max: formatMs(Math.max(...durations)),
    },
    responseBytes: {
      min: formatBytes(Math.min(...bytes)),
      median: formatBytes(percentile(bytes, 50)),
      max: formatBytes(Math.max(...bytes)),
    },
  })
}

run().catch((error) => {
  console.error('[bench-members-server] failed', error)
  process.exitCode = 1
})
