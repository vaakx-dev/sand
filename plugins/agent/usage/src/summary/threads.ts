import type { SessionSummary } from '@sand/sessions-sqlite/contract'
import type { ProjectUsage, ThreadUsage } from '../contract'
import { grouped } from './grouped'
import { byCost, emptyTotals } from './totals'

const topThreads = 20

type ThreadTally = Omit<ThreadUsage, 'agents' | 'accounts'> & { agentIds: Set<string>; accounts: Set<string> }
type ProjectTally = Omit<ProjectUsage, 'threads' | 'accounts'> & { roots: Set<string>; accounts: Set<string> }

export const rootFinder = (infos: Map<string, SessionSummary>) => (id: string) => {
  let info = infos.get(id)
  while (info?.kind === 'agent' && info.parent && infos.has(info.parent)) info = infos.get(info.parent)
  return info?.id ?? id
}

const threadOf = (id: string, info?: SessionSummary): ThreadTally => ({
  ...emptyTotals(),
  id,
  title: info?.title ?? null,
  cwd: info?.cwd ?? '',
  agentIds: new Set<string>(),
  accounts: new Set<string>(),
})

const projectOf = (cwd: string): ProjectTally => ({ ...emptyTotals(), cwd, roots: new Set<string>(), accounts: new Set<string>() })

export const threadBook = (infos: Map<string, SessionSummary>) => {
  const threads = new Map<string, ThreadTally>()
  const projects = new Map<string, ProjectTally>()

  const add = (root: string, session: string, account: string) => {
    const thread = grouped(threads, root, () => threadOf(root, infos.get(root)))
    const project = grouped(projects, thread.cwd, () => projectOf(thread.cwd))
    if (session !== root) thread.agentIds.add(session)
    thread.accounts.add(account)
    project.roots.add(root)
    project.accounts.add(account)
    return [thread, project] as const
  }

  const finish = () => ({
    count: threads.size,
    threads: [...threads.values()]
      .sort(byCost)
      .slice(0, topThreads)
      .map(({ agentIds, accounts, ...thread }): ThreadUsage => ({ ...thread, agents: agentIds.size, accounts: [...accounts] })),
    projects: [...projects.values()]
      .sort(byCost)
      .map(({ roots, accounts, ...project }): ProjectUsage => ({ ...project, threads: roots.size, accounts: [...accounts] })),
  })

  return { add, finish }
}
