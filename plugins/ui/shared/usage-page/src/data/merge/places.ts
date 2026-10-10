import { folderName } from '@sand/kit'
import { addTotals, byCost, emptyTotals, grouped, including } from '../totals'
import type { PcSummary, PcUsage, Project, Thread } from '../types'

export const mergeThreads = (parts: PcSummary[]): Thread[] =>
  parts.flatMap(({ pc, summary }) => summary.threads.map(thread => ({ ...thread, machine: pc.id }))).sort(byCost)

export const mergeProjects = (parts: PcSummary[]) => {
  const byName = new Map<string, Project>()
  for (const { pc, summary } of parts)
    for (const project of summary.projects) {
      const name = project.cwd ? folderName(project.cwd) : 'No folder'
      const into = grouped(byName, name, (): Project => ({ ...emptyTotals(), name, threads: 0, accounts: [], machines: [] }))
      addTotals(into, project)
      into.threads += project.threads
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
