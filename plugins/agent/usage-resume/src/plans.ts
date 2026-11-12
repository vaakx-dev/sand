import type { ConversationRef } from '@sand/engine/contract'
import type { Schedule, Schedules } from '@sand/schedules/contract'
import { z } from 'zod'
import type { Resume } from './contract'

const OWNER = 'usage-resume'

const planned = z.object({ owner: z.enum(['thread', 'bot']), id: z.string(), turn: z.string(), resume: z.boolean() })

type Planned = z.infer<typeof planned>

interface Plan extends Planned {
  at: number
}

const subjectOf = ({ owner, id }: ConversationRef) => `${owner}:${id}`

const plannedOf = (data: unknown): Planned => planned.parse(data)

const planOf = ({ next, data }: Schedule): Plan[] => (next === undefined ? [] : [{ ...plannedOf(data), at: next }])

export const createPlans = (schedules: Schedules) => {
  const scheduled = (conversation: ConversationRef) => schedules.list(OWNER, subjectOf(conversation))
  const drop = (found: Schedule[]) => found.forEach(schedule => schedules.remove(schedule.id))
  const plans = () => schedules.list(OWNER).flatMap(planOf)

  const plan = ({ owner, id, turn, resume, at }: Plan) => {
    drop(scheduled({ owner, id }))
    schedules.create({ owner: OWNER, subject: subjectOf({ owner, id }), when: { kind: 'once', at }, data: { owner, id, turn, resume } satisfies Planned })
  }

  return {
    owner: OWNER,
    plannedOf,
    plan,
    of: (conversation: ConversationRef) => scheduled(conversation).flatMap(planOf)[0],
    forget: (conversation: ConversationRef) => drop(scheduled(conversation)),
    cancel: (turn: string) =>
      plans()
        .filter(found => found.turn === turn && found.resume)
        .forEach(found => plan({ ...found, resume: false })),
    list: (): Resume[] => plans().flatMap(({ turn, at, resume }) => (resume ? [{ turn, at }] : [])),
  }
}
