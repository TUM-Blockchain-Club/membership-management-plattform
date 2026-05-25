#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE ||= 'ubuntu24.04-x64'

const { chromium } = await import('@playwright/test')

const baseTargetUrl = process.env.BENCH_URL || 'http://127.0.0.1:3000/members'
const scrollSteps = Number(process.env.BENCH_SCROLL_STEPS || '24')
const scrollStepPx = Number(process.env.BENCH_SCROLL_STEP_PX || '520')
const scrollDelayMs = Number(process.env.BENCH_SCROLL_DELAY_MS || '80')
const postLoadWaitMs = Number(process.env.BENCH_POST_LOAD_WAIT_MS || '3000')
const reportsDir = process.env.BENCH_REPORT_DIR || 'reports/performance'
const traceEnabled = process.env.BENCH_TRACE !== 'false'

const withPerfQuery = (rawUrl) => {
  const url = new URL(rawUrl)
  url.searchParams.set('perf', '1')
  return url.toString()
}

const targetUrl = withPerfQuery(baseTargetUrl)
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const reportPath = path.join(reportsDir, `members-browser-${timestamp}.json`)
const tracePath = path.join(reportsDir, `members-browser-${timestamp}.zip`)

const pickMetrics = (metrics) => {
  const wanted = new Set([
    'TaskDuration',
    'ScriptDuration',
    'LayoutDuration',
    'RecalcStyleDuration',
    'JSHeapUsedSize',
    'JSHeapTotalSize',
    'Nodes',
    'Documents',
    'Frames',
    'LayoutCount',
    'RecalcStyleCount',
  ])

  return Object.fromEntries(
    metrics
      .filter((metric) => wanted.has(metric.name))
      .map((metric) => [metric.name, metric.value]),
  )
}

const diffMetrics = (before, after) => {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  return Object.fromEntries(
    [...keys].map((key) => [key, Number(((after[key] ?? 0) - (before[key] ?? 0)).toFixed(3))]),
  )
}

const serializeConsoleMessage = async (message) => {
  const values = []

  for (const arg of message.args()) {
    try {
      values.push(await arg.jsonValue())
    } catch {
      values.push(String(arg))
    }
  }

  return {
    type: message.type(),
    text: message.text(),
    values,
  }
}

const getPageSummary = async (page) =>
  page.evaluate(() => {
    const resources = performance.getEntriesByType('resource')
      .map((entry) => {
        const resource = entry
        return {
          name: resource.name,
          initiatorType: resource.initiatorType,
          duration: Math.round(resource.duration),
          transferSize: resource.transferSize,
          encodedBodySize: resource.encodedBodySize,
        }
      })

    const byType = resources.reduce((summary, resource) => {
      const key = resource.initiatorType || 'other'
      const current = summary[key] ?? {
        count: 0,
        duration: 0,
        transferSize: 0,
        encodedBodySize: 0,
      }

      current.count += 1
      current.duration += resource.duration
      current.transferSize += resource.transferSize
      current.encodedBodySize += resource.encodedBodySize
      summary[key] = current
      return summary
    }, {})

    const slowResources = [...resources]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 12)

    return {
      location: window.location.href,
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      dom: {
        elements: document.getElementsByTagName('*').length,
        memberCards: document.querySelectorAll('[data-member-card]').length,
        virtualRows: document.querySelectorAll('[data-virtual-row]').length,
      },
      resources: {
        byType,
        slowResources,
      },
    }
  })

const run = async () => {
  await fs.mkdir(reportsDir, { recursive: true })

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  })

  if (traceEnabled) {
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: false,
    })
  }

  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  const consoleMessages = []

  page.on('console', async (message) => {
    consoleMessages.push(await serializeConsoleMessage(message))
  })

  await client.send('Performance.enable')

  const navigationStartedAt = performance.now()
  const response = await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60_000 })
  const navigationMs = performance.now() - navigationStartedAt

  await page.waitForTimeout(postLoadWaitMs)
  const afterLoadMetrics = pickMetrics((await client.send('Performance.getMetrics')).metrics)
  const afterLoadSummary = await getPageSummary(page)

  const beforeScrollMetrics = afterLoadMetrics
  const scrollStartedAt = performance.now()
  await page.evaluate(
    async ({ steps, stepPx, delayMs }) => {
      for (let index = 0; index < steps; index += 1) {
        window.scrollBy({ top: stepPx, behavior: 'instant' })
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    },
    { steps: scrollSteps, stepPx: scrollStepPx, delayMs: scrollDelayMs },
  )
  await page.waitForTimeout(1500)
  const scrollMs = performance.now() - scrollStartedAt
  const afterScrollMetrics = pickMetrics((await client.send('Performance.getMetrics')).metrics)
  const afterScrollSummary = await getPageSummary(page)

  if (traceEnabled) {
    await context.tracing.stop({ path: tracePath })
  }

  await browser.close()

  const membersPerfMessages = consoleMessages.filter((message) =>
    message.text.startsWith('[members-perf]'),
  )
  const webVitalsMessages = consoleMessages.filter((message) =>
    message.text.startsWith('[web-vitals]'),
  )

  const report = {
    targetUrl,
    status: response?.status() ?? null,
    navigationMs: Math.round(navigationMs),
    scrollMs: Math.round(scrollMs),
    metrics: {
      afterLoad: afterLoadMetrics,
      afterScroll: afterScrollMetrics,
      scrollDelta: diffMetrics(beforeScrollMetrics, afterScrollMetrics),
    },
    page: {
      afterLoad: afterLoadSummary,
      afterScroll: afterScrollSummary,
    },
    console: {
      membersPerfMessages,
      webVitalsMessages,
      warningsAndErrors: consoleMessages.filter((message) =>
        ['warning', 'error'].includes(message.type),
      ),
    },
    tracePath: traceEnabled ? tracePath : null,
  }

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)

  console.info('[bench-members-browser] summary', {
    targetUrl,
    status: report.status,
    navigationMs: report.navigationMs,
    scrollMs: report.scrollMs,
    mountedAfterLoad: report.page.afterLoad.dom,
    mountedAfterScroll: report.page.afterScroll.dom,
    scrollCpuSeconds: {
      task: Number(report.metrics.scrollDelta.TaskDuration?.toFixed(3) ?? 0),
      script: Number(report.metrics.scrollDelta.ScriptDuration?.toFixed(3) ?? 0),
      layout: Number(report.metrics.scrollDelta.LayoutDuration?.toFixed(3) ?? 0),
      recalcStyle: Number(report.metrics.scrollDelta.RecalcStyleDuration?.toFixed(3) ?? 0),
    },
    resourceTypes: report.page.afterScroll.resources.byType,
    membersPerfMessages: membersPerfMessages.length,
    reportPath,
    tracePath: report.tracePath,
  })
}

run().catch((error) => {
  console.error('[bench-members-browser] failed', error)
  process.exitCode = 1
})
