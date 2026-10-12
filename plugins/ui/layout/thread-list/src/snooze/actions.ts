import type { NavAction } from '@sand/protocol'
import type { Thread } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { backLabel, parseWhen, presets } from './when'

type Ctx = Context<'threads'>

export const snoozedUntil = (thread: Thread) => {
  const until = thread.info.snoozed
  return until && until > Date.now() && !thread.running ? until : undefined
}

export const isBack = (thread: Thread) => Boolean(thread.info.snoozed && thread.info.snoozed <= Date.now())

const wakeNow = (ctx: Ctx, thread: Thread): NavAction => ({
  id: 'wake',
  group: 'organise',
  label: 'Wake now',
  icon: 'wake',
  quick: true,
  run: () => ctx.threads.snooze(thread.id, null),
})

const snoozeLater = (ctx: Ctx, thread: Thread): NavAction => ({
  id: 'snooze',
  group: 'organise',
  label: 'Snooze',
  icon: 'snooze',
  quick: true,
  choices: presets.map(preset => ({
    id: preset.id,
    label: preset.label,
    tip: () => backLabel(Date.now() + preset.span),
    run: () => ctx.threads.snooze(thread.id, Date.now() + preset.span),
  })),
  ask: {
    placeholder: '30m, 3d, fri 9am',
    tip: 'Pick a time',
    submit: 'Snooze',
    preview(text) {
      const at = parseWhen(text)
      return at ? backLabel(at) : undefined
    },
    run(text) {
      const at = parseWhen(text)
      return at ? ctx.threads.snooze(thread.id, at) : undefined
    },
  },
  run: () => {},
})

export const snoozeAction = (ctx: Ctx, thread: Thread) => (snoozedUntil(thread) ? wakeNow(ctx, thread) : snoozeLater(ctx, thread))
