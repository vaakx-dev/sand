import { byCost, emptyTotals } from '@sand/usage/records'
import { folderName, grouped } from '@sand/util'
import { addTotals, including } from '../totals'
import type { PcSummary, PcUsage, Project } from '../types'

export const mergeProjects = (parts: PcSummary[]) => {
  const byName = new Map<string, Project>()
  for (const { pc, summary } of parts)
    for (const project of summary.projects) {
      const name = project.cwd ? folderName(project.cwd) : 'No folder'
      const into = grouped(byName, name, (): Project => ({ ...emptyTotals(), name, accounts: [], machines: [] }))
      addTotals(into, project)
      including(into.accounts, project.accounts)
      including(into.machines, [pc.id])
    }
  return [...byName.values()].sort(byCost)
}

export const pcUsage = (parts: PcSummary[]): PcUsage[] =>
  parts
    .map(({ pc, summary }) => ({
      ...addTotals(emptyTotals(), summary.total),
      id: pc.id,
      name: pc.name,
      accounts: summary.accounts.filter(account => account.turns).map(account => account.key),
    }))
    .sort(byCost)
