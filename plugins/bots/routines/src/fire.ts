import type { BotTurns } from '@sand/bot-turns/contract'
import type { UserContent } from '@sand/chats/contract'
import type { Moment, MomentKind } from '@sand/devices-notify/contract'
import type { Fire, Handler } from '@sand/schedules/contract'
import { type Routine, routineRecord } from './contract'
import { routineOf } from './routines'
import { timeIn, zoneOf } from './time'

const lateness = (routine: Routine, fire: Fire) =>
  fire.late ? ` It was due ${timeIn(fire.due, zoneOf(routine.when))}, but sand was not running then, so it is late; say so.` : ''

const promptOf = (routine: Routine, fire: Fire): UserContent[] => {
  const text = [
    `Your routine "${routine.name}" is due now.${lateness(routine, fire)} Do what it says. The user may not be watching, so your reply is what they will read later.`,
    ...(fire.note ? [`Its check found:\n${fire.note}`] : []),
    `<routine>\n${routine.instructions}\n</routine>`,
  ].join('\n\n')
  return [
    { type: 'text', text },
    { type: 'context', records: [{ v: 1, id: routine.id, kind: routineRecord, label: routine.name, data: { repeats: routine.when.kind === 'cron' } }] },
  ]
}

const moments: Partial<Record<string, MomentKind>> = { completed: 'routine', failed: 'failed', lost: 'failed' }

export interface Firing {
  turns: BotTurns
  lastSaid(bot: string): string
  tell(moment: Moment): void
}

export const fireRoutine =
  ({ turns, lastSaid, tell }: Firing): Handler =>
  async (schedule, fire, signal) => {
    const routine = routineOf(schedule)
    const sent = await turns.send(routine.bot, { prompt: promptOf(routine, fire), mode: 'queue', origin: 'routine', label: routine.name, clientRequestId: fire.key })
    const turn = await turns.follow(routine.bot, sent, signal)
    const kind = turn && moments[turn.status]
    if (!turn || !kind) return
    const failed = kind === 'failed'
    tell({ kind, title: routine.name, text: failed ? (turn.error ?? '') : lastSaid(routine.bot) })
    if (failed) throw new Error(turn.error ?? 'The turn failed')
  }
