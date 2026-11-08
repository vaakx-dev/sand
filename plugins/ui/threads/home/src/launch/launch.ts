import { composer } from '@sand/composer/contract'
import type { Pulse } from '@sand/reactive'
import type { Kit } from '@sand/ui-kit/contract'
import { homeRoute, type Screen, type Shell } from '@sand/ui-shell/contract'
import { joinDisposers } from '@sand/util'
import type { Threads } from '@sand/web-client/contract'
import { derive, div, dynamicChild, effect, onTimeout, sig, untrack, type Child } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { places } from '../palette/places'
import { openDraft } from '../palette/projects'
import { projectPicker } from './picker'

export interface LaunchParts {
  ctx: Context
  kit: Kit
  shell: Shell
  threads: Threads
  pulse: Pulse
}

type Holder = 'phone' | 'wide'

const homeScreen = ({ kit }: LaunchParts, composerHere: Child): Screen => ({
  head: () => kit.headTitle(2, 'New chat'),
  main: () =>
    div(
      { class: 'flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 pb-24' },
      div({ class: 'flex items-center gap-2 text-neutral-100' }, kit.appIcon(20), kit.rowTitle('Sand')),
      div({ class: [kit.pageColumn, 'flex flex-col'] }, composerHere),
    ),
})

const leaveThreadFolder = ({ ctx, threads }: LaunchParts) => {
  const draft = threads.drafting()
  if (!draft?.cwd) return
  const known = places(ctx, threads).filter(place => !place.away)
  if (known.some(place => place.path === draft.cwd)) return
  const recent = known.toSorted((a, b) => b.updated - a.updated)[0]
  void openDraft(ctx, threads, recent?.path ?? '', recent?.device ?? draft.device)
}

const draftingSlots = ({ ctx, kit, shell, threads, pulse }: LaunchParts) => {
  const drafting = pulse.read(() => !threads.current())
  return ctx.watch(composer, found => {
    if (!found) return
    return effect(() => {
      if (!drafting.get()) return
      const off = joinDisposers(
        found.slot('start', () => projectPicker(ctx, kit, threads, pulse)),
        found.slot('above', () => shell.chipBar({ kind: 'general' })),
      )
      return () => void off()
    })
  })
}

export const launch = (parts: LaunchParts) => {
  const { ctx, shell } = parts
  const taken = sig<{ view: HTMLElement } | undefined>(undefined)
  const holder = derive((): Holder | undefined => {
    if (shell.current().kind !== homeRoute) return undefined
    return shell.state() === 'phone' ? 'phone' : 'wide'
  })
  const composerIn = (place: Holder) =>
    dynamicChild(
      () => (holder.get() === place ? taken.get() : undefined),
      found => (found ? div({ class: 'contents' }, found.view) : null),
    )
  ctx.watch(composer, found => {
    if (!found) return taken.set(undefined)
    return onTimeout(() => taken.set({ view: found.view() }), 0)
  })
  ctx.effect(() =>
    effect(() => {
      parts.pulse.version.get()
      if (holder.get()) untrack(() => leaveThreadFolder(parts))
    }),
  )
  ctx.effect(() => shell.mount('home', div({ class: 'flex shrink-0 flex-col' }, composerIn('phone'))))
  ctx.effect(() => shell.route({ kind: homeRoute, render: () => homeScreen(parts, composerIn('wide')) }))
  draftingSlots(parts)
}
