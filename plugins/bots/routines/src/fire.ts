import type { BotTurns } from '@sand/bot-turns/contract'
import { notificationText } from '@sand/chats/contract'
import type { Moment, MomentKind } from '@sand/devices-notify/contract'
import type { Fire, Handler } from '@sand/schedules/contract'
import type { Routine } from './contract'
import { routineOf } from './routines'

const guide = (fire: Fire) =>
  `Do what these instructions say.${fire.late ? ' It is late, so say so.' : ''} The user may be away, so write your reply for them to read later.`

const promptOf = (routine: Routine, fire: Fire) =>
  notificationText({
    from: 'routine',
    id: routine.id,
    kind: routine.when.kind === 'cron' ? 'routine' : 'reminder',
    label: routine.name,
    status: fire.late ? 'late' : 'due',
    at: fire.due,
    result: [guide(fire), `<instructions>\n${routine.instructions}\n</instructions>`].join('\n\n'),
  })

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
