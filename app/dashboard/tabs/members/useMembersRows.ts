import { useMemo } from 'react'
import type { DashboardMember } from '@/app/components/dashboard/types'

// ── Row type definitions ──────────────────────────────────────────────────

export type VRow =
  | { kind: 'separator'; title?: string; gradient?: boolean; color?: 'purple' | 'cyan' | 'blue' }
  | { kind: 'sub-separator' }
  | { kind: 'anchor'; anchorId: string }
  | { kind: 'heading'; anchorId: string; variant: 'honorary' | 'alumni' | 'advisors' }
  | { kind: 'grid-row'; members: DashboardMember[]; isHonorary?: boolean; isAlumni?: boolean; isAdvisor?: boolean }
  | { kind: 'empty-state' }

export interface MembersRowsResult {
  rows: VRow[]
  /** Maps section anchor IDs to the index of their first row in `rows`. */
  sectionIndexMap: Record<string, number>
}

interface Input {
  boardMembers: DashboardMember[]
  coreMembers: DashboardMember[]
  exCoreHonorary: DashboardMember[]
  exCoreAlumni: DashboardMember[]
  exCoreAdvisors: DashboardMember[]
  exCoreOthers: DashboardMember[]
  otherMembers: DashboardMember[]
  filteredMembers: DashboardMember[]
  /** Number of columns in the current grid layout. */
  cols: number
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useMembersRows({
  boardMembers,
  coreMembers,
  exCoreHonorary,
  exCoreAlumni,
  exCoreAdvisors,
  exCoreOthers,
  otherMembers,
  filteredMembers,
  cols,
}: Input): MembersRowsResult {
  return useMemo(() => {
    const rows: VRow[] = []
    const sectionIndexMap: Record<string, number> = {}

    const pushGridRows = (
      members: DashboardMember[],
      flags: { isHonorary?: boolean; isAlumni?: boolean; isAdvisor?: boolean } = {},
    ) => {
      for (let i = 0; i < members.length; i += cols) {
        rows.push({ kind: 'grid-row', members: members.slice(i, i + cols), ...flags })
      }
    }

    const hasExCore =
      exCoreHonorary.length > 0 ||
      exCoreAlumni.length > 0 ||
      exCoreAdvisors.length > 0 ||
      exCoreOthers.length > 0

    // ── Board ─────────────────────────────────────────────────────────
    if (boardMembers.length > 0) {
      sectionIndexMap.board = rows.length
      rows.push({ kind: 'anchor', anchorId: 'board' })
      pushGridRows(boardMembers)
    }

    // ── Core ──────────────────────────────────────────────────────────
    if (coreMembers.length > 0) {
      if (boardMembers.length > 0) {
        rows.push({ kind: 'separator', title: 'Core Members', gradient: true, color: 'blue' })
      }
      sectionIndexMap.core = rows.length
      rows.push({ kind: 'anchor', anchorId: 'core' })
      pushGridRows(coreMembers)
    }

    // ── Ex-Core separator ─────────────────────────────────────────────
    if ((boardMembers.length > 0 || coreMembers.length > 0) && hasExCore) {
      rows.push({ kind: 'separator', title: 'Ex-Core Members', gradient: true, color: 'purple' })
    }

    // ── Honorary ──────────────────────────────────────────────────────
    if (exCoreHonorary.length > 0) {
      sectionIndexMap.honorary = rows.length
      rows.push({ kind: 'heading', anchorId: 'honorary', variant: 'honorary' })
      pushGridRows(exCoreHonorary, { isHonorary: true })
    }

    // ── Alumni ────────────────────────────────────────────────────────
    if (exCoreAlumni.length > 0) {
      if (exCoreHonorary.length > 0) rows.push({ kind: 'sub-separator' })
      sectionIndexMap.alumni = rows.length
      rows.push({ kind: 'heading', anchorId: 'alumni', variant: 'alumni' })
      pushGridRows(exCoreAlumni, { isAlumni: true })
    }

    // ── Advisors ──────────────────────────────────────────────────────
    if (exCoreAdvisors.length > 0) {
      if (exCoreAlumni.length > 0) rows.push({ kind: 'sub-separator' })
      sectionIndexMap.advisors = rows.length
      rows.push({ kind: 'heading', anchorId: 'advisors', variant: 'advisors' })
      pushGridRows(exCoreAdvisors, { isAdvisor: true })
    }

    // ── Ex-Core Others ────────────────────────────────────────────────
    if (exCoreOthers.length > 0) {
      const hasPrevExCore =
        exCoreHonorary.length > 0 || exCoreAlumni.length > 0 || exCoreAdvisors.length > 0
      if (hasPrevExCore) rows.push({ kind: 'sub-separator' })
      if (!('others' in sectionIndexMap)) sectionIndexMap.others = rows.length
      rows.push({ kind: 'anchor', anchorId: 'others' })
      pushGridRows(exCoreOthers)
    }

    // ── Other Members ─────────────────────────────────────────────────
    if (otherMembers.length > 0) {
      if (filteredMembers.length > otherMembers.length) {
        rows.push({ kind: 'separator', title: 'Other Members' })
      }
      if (!('others' in sectionIndexMap)) sectionIndexMap.others = rows.length
      pushGridRows(otherMembers)
    }

    // ── Empty state ───────────────────────────────────────────────────
    if (filteredMembers.length === 0) {
      rows.push({ kind: 'empty-state' })
    }

    return { rows, sectionIndexMap }
  }, [
    boardMembers,
    coreMembers,
    exCoreHonorary,
    exCoreAlumni,
    exCoreAdvisors,
    exCoreOthers,
    otherMembers,
    filteredMembers,
    cols,
  ])
}
