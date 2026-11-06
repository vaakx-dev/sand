import { type Check, localInstant, type Schedules, systemZone, type Watch, type When } from '@sand/schedules/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Routines } from '../routines'
import { timeIn, timing, zoneOf } from '../time'

const fields = z.object({
  name: z.string().trim().min(1).max(60).describe('A short name the user sees, like "Call Ana"'),
  instructions: z
    .string()
    .trim()
    .min(1)
    .describe('What to do when it comes due, written to your future self, like "Remind the user to call Ana about Friday\'s lunch"'),
  at: z.string().optional().describe('For one time: the local date and time, like 2026-11-04 18:00'),
  in_minutes: z.number().int().min(1).optional().describe('For one time: how many minutes from now'),
  repeat: z
    .string()
    .optional()
    .describe(`To repeat: a five-field cron schedule in local time, like "0 9 * * 1-5" for weekdays at 9:00`),
  zone: z.string().optional().describe(`The time zone for at and repeat, like Europe/Berlin. Default: ${systemZone()}`),
  if_missed: z.enum(['run', 'skip']).optional().describe('If a due time is missed because sand was off: run once when it is back (the default), or skip that time'),
})

const watchOf = (checks: Check[]) => {
  const [first, ...rest] = checks.map(check => check.input.extend({ check: z.literal(check.name) }).describe(check.description))
  if (!first) return undefined
  return z
    .discriminatedUnion('check', [first, ...rest])
    .optional()
    .describe('With repeat: a check that runs at each due time at no cost; you act only when it finds something')
}

type Input = z.output<typeof fields> & { watch?: { check: string } & Record<string, unknown> }

const whenOf = ({ at, in_minutes, repeat, zone = systemZone() }: Input): When => {
  if ([at, in_minutes, repeat].filter(given => given !== undefined).length !== 1) throw new Error('Give exactly one of at, in_minutes or repeat')
  if (repeat !== undefined) return { kind: 'cron', cron: repeat, zone }
  if (in_minutes !== undefined) return { kind: 'once', at: Date.now() + in_minutes * 60_000 }
  return { kind: 'once', at: localInstant(at!, zone) }
}

const watched = ({ check, ...input }: { check: string } & Record<string, unknown>): Watch => ({ check, input })

export const createTool = (routines: Routines, schedules: Schedules): Tool => {
  const watch = watchOf(schedules.checks())
  return {
    name: 'routine_create',
    description:
      'Set yourself a reminder or a routine: when it comes due, you act on its instructions in this chat, even while the user is away. Use at or in_minutes for one time, or repeat for a recurring schedule.',
    needs: ['routines'],
    input: watch ? fields.extend({ watch }) : fields,
    act: ({ name }: Input, { cwd }) => ({ effect: 'write', paths: [cwd], summary: `Set the routine ${name}` }),
    run(input: Input, { conversation }) {
      const when = whenOf(input)
      if (input.watch && when.kind !== 'cron') throw new Error('A watch needs repeat, to say how often to check')
      const routine = routines.create(conversation.id, {
        name: input.name,
        instructions: input.instructions,
        when,
        ...(input.if_missed && { missed: input.if_missed }),
        ...(input.watch && { watch: watched(input.watch) }),
      })
      const next = routine.next === undefined ? '' : ` Next: ${timeIn(routine.next, zoneOf(when))}.`
      return `Set "${routine.name}" (${routine.id}), ${timing(when)}.${next}`
    },
  }
}
