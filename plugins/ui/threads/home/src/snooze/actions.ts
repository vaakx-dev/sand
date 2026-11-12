import type { MenuAction } from '@sand/ui-shell/contract'
import type { Thread, Threads } from '@sand/web-client/contract'
import { backLabel, parseWhen, presets } from './when'

export const snoozedUntil = (thread: Thread) => {
  const until = thread.info.snoozed
  return until && until > Date.now() && !thread.running ? until : undefined
}

export const isBack = (thread: Thread) => Boolean(thread.info.snoozed && thread.info.snoozed <= Date.now())

const wakeNow = (threads: Threads, thread: Thread): MenuAction => ({
  id: 'wake',
  group: 'organise',
  label: 'Wake now',
  icon: 'wake',
  quick: true,
  run: () => threads.update(thread.id, { snoozed: null }),
})

const snoozeLater = (threads: Threads, thread: Thread): MenuAction => ({
  id: 'snooze',
  group: 'organise',
  label: 'Snooze',
  icon: 'snooze',
  quick: true,
  choices: presets.map(preset => ({
    id: preset.id,
    label: preset.label,
    tip: () => backLabel(Date.now() + preset.span),
    run: () => threads.update(thread.id, { snoozed: Date.now() + preset.span }),
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
      return at ? threads.update(thread.id, { snoozed: at }) : undefined
    },
  },
  run: () => {},
})

export const snoozeAction = (threads: Threads, thread: Thread) => (snoozedUntil(thread) ? wakeNow(threads, thread) : snoozeLater(threads, thread))
