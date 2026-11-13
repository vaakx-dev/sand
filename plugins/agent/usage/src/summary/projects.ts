import type { SessionSummary } from '@sand/chats/contract'
import { grouped } from '@sand/util'
import type { ProjectUsage } from '../contract'
import { byCost, emptyTotals } from '../records'

export const projectBook = (infos: Map<string, SessionSummary>) => {
  const projects = new Map<string, ProjectUsage>()

  const add = (session: string) => {
    const cwd = infos.get(session)?.cwd ?? ''
    return grouped(projects, cwd, () => ({ ...emptyTotals(), cwd }))
  }

  const finish = () => [...projects.values()].sort(byCost)

  return { add, finish }
}
