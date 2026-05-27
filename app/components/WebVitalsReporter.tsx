'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (process.env.NEXT_PUBLIC_LOG_WEB_VITALS !== 'true') return

    console.info('[web-vitals]', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
    })
  })

  return null
}
