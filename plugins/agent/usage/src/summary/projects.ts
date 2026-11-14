import type { SessionSummary } from '@sand/chats/contract'
import { grouped } from '@sand/util'
import { dirname } from 'node:path'
import type { ProjectUsage } from '../contract'
import { byCost, emptyTotals } from '../records'

const placeOf = (info: SessionSummary | undefined) => (info?.kind === 'bot' ? dirname(info.cwd) : (info?.cwd ?? ''))

export const projectBook = (infos: Map<string, SessionSummary>) => {
  const projects = new Map<string, ProjectUsage>()

  const add = (session: string) => {
    const cwd = placeOf(infos.get(session))
    return grouped(projects, cwd, () => ({ ...emptyTotals(), cwd }))
  }

  const finish = () => [...projects.values()].sort(byCost)

  return { add, finish }
}
