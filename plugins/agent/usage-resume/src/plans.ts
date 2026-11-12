import type { ConversationRef } from '@sand/engine/contract'
import type { Schedule, Schedules } from '@sand/schedules/contract'
import { z } from 'zod'
import type { Resume } from './contract'

const OWNER = 'usage-resume'

const planned = z.object({ owner: z.enum(['thread', 'bot']), id: z.string(), turn: z.string() })

type Planned = z.infer<typeof planned>

const subjectOf = ({ owner, id }: ConversationRef) => `${owner}:${id}`

const plannedOf = (data: unknown): Planned => planned.parse(data)

const due = (schedule: Schedule) => schedule.next !== undefined

export const createPlans = (schedules: Schedules) => {
  const of = (conversation: ConversationRef) => schedules.list(OWNER, subjectOf(conversation))
  const drop = (found: Schedule[]) => found.forEach(schedule => schedules.remove(schedule.id))

  return {
    owner: OWNER,
    plannedOf,
    plan({ owner, id }: ConversationRef, turn: string, at: number) {
      drop(of({ owner, id }))
      schedules.create({ owner: OWNER, subject: subjectOf({ owner, id }), when: { kind: 'once', at }, data: { owner, id, turn } satisfies Planned })
    },
    waiting: (conversation: ConversationRef) => of(conversation).some(due),
    forget: (conversation: ConversationRef) => drop(of(conversation)),
    cancel: (turn: string) => drop(schedules.list(OWNER).filter(({ data }) => plannedOf(data).turn === turn)),
    list: (): Resume[] => schedules.list(OWNER).flatMap(({ next, data }) => (next === undefined ? [] : [{ turn: plannedOf(data).turn, at: next }])),
  }
}
