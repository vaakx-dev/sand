import type { NavAction } from '@sand/dom'
import type { Thread } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { backLabel, parseWhen, presets } from './when'

type Ctx = Context<'threads'>

export const snoozedUntil = (thread: Thread, now = Date.now()) => {
  const until = thread.info.snoozed
  return until && until > now && !thread.running ? until : undefined
}

export const isBack = (thread: Thread, now = Date.now()) => Boolean(thread.info.snoozed && thread.info.snoozed <= now)

const snoozeFor = (ctx: Ctx, thread: Thread, until: number) => () => ctx.threads.snooze(thread.id, until)

const wakeAction = (ctx: Ctx, thread: Thread): NavAction => ({
  id: 'wake',
  group: 'organise',
  label: 'Wake now',
  icon: 'wake',
  quick: true,
  run: () => ctx.threads.snooze(thread.id, null),
})

const snoozeAction = (ctx: Ctx, thread: Thread): NavAction => ({
  id: 'snooze',
  group: 'organise',
  label: 'Snooze',
  icon: 'snooze',
  quick: true,
  choices: presets.map(preset => ({
    id: preset.id,
    label: preset.label,
    tip: () => backLabel(Date.now() + preset.span),
    run: () => snoozeFor(ctx, thread, Date.now() + preset.span)(),
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
      return at ? snoozeFor(ctx, thread, at)() : undefined
    },
  },
  run: () => {},
})

export const snoozeActions = (ctx: Ctx, thread: Thread): NavAction[] => [snoozedUntil(thread) ? wakeAction(ctx, thread) : snoozeAction(ctx, thread)]
