import type { SessionSummary } from '@sand/chats/contract'
import { grouped } from '@sand/util'
import { dirname } from 'node:path'
import type { ProjectUsage } from '../contract'
import { byCost, emptyTotals } from '../records'
import type { Turn } from './turns'

const placeOf = (info: SessionSummary | undefined) => (info?.kind === 'bot' ? dirname(info.cwd) : (info?.cwd ?? ''))

export const projectBook = (infos: Map<string, SessionSummary>) => {
  const projects = new Map<string, ProjectUsage>()

  const add = ({ session, cwd: worked }: Turn) => {
    const cwd = worked ?? placeOf(session ? infos.get(session) : undefined)
    return grouped(projects, cwd, () => ({ ...emptyTotals(), cwd }))
  }

  const finish = () => [...projects.values()].sort(byCost)

  return { add, finish }
}
