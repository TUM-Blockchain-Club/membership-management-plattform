import { createContext } from 'react'
import type { useDashboardController } from './useDashboardController'

export type DashboardController = ReturnType<typeof useDashboardController>

// Provided at the (dashboard) route-group layout; never null for authenticated pages.
export const DashboardContext = createContext<DashboardController | null>(null)
