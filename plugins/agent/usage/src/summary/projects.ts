import type { SessionSummary } from '@sand/chats/contract'
import { grouped } from '@sand/util'
import type { ProjectUsage } from '../contract'
import { byCost, emptyTotals } from '../records'

type Tally = Omit<ProjectUsage, 'accounts'> & { accounts: Set<string> }

const tallyOf = (cwd: string): Tally => ({ ...emptyTotals(), cwd, accounts: new Set<string>() })

export const projectBook = (infos: Map<string, SessionSummary>) => {
  const projects = new Map<string, Tally>()

  const add = (session: string, account: string) => {
    const cwd = infos.get(session)?.cwd ?? ''
    const project = grouped(projects, cwd, () => tallyOf(cwd))
    project.accounts.add(account)
    return project
  }

  const finish = (): ProjectUsage[] =>
    [...projects.values()].sort(byCost).map(({ accounts, ...project }) => ({ ...project, accounts: [...accounts] }))

  return { add, finish }
}
