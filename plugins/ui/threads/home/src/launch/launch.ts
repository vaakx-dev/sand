import { draftRoute } from '@sand/chat/contract'
import { composer, type Composer } from '@sand/composer/contract'
import type { Pulse } from '@sand/reactive'
import type { Kit } from '@sand/ui-kit/contract'
import { homeRoute, type Screen, type Shell } from '@sand/ui-shell/contract'
import { joinDisposers } from '@sand/util'
import type { Threads } from '@sand/web-client/contract'
import { div, dynamicChild, effect, h1, sig, untrack, type Child } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { currentPlace, places } from '../palette/places'
import { openDraft } from '../palette/projects'
import { projectPicker } from './picker'

export interface LaunchParts {
  ctx: Context
  kit: Kit
  shell: Shell
  threads: Threads
  pulse: Pulse
}

const homeScreen = ({ kit }: LaunchParts, composerHere: Child): Screen => ({
  head: () => h1({ class: 'sr-only' }, 'New chat'),
  main: () =>
    div(
      { class: 'flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-24' },
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
        found.slot('above', () => div({ class: 'flex' }, projectPicker(ctx, kit, threads, pulse)), 0),
        found.slot('above', () => shell.chipBar({ kind: 'general' }), 1),
      )
      return () => void off()
    })
  })
}

export const newChat = ({ ctx, shell, threads }: LaunchParts) => {
  if (shell.state() !== 'phone') return shell.open({ kind: homeRoute })
  const here = currentPlace(ctx, threads)
  void openDraft(ctx, threads, here.path, here.device).then(() => {
    const draft = threads.drafting()
    if (draft) shell.open({ kind: draftRoute, id: draft.id })
  })
}

export const launch = (parts: LaunchParts) => {
  const { ctx, shell } = parts
  const found = sig<Composer | undefined>(undefined)
  const composerView = () => dynamicChild(found, composer => composer?.view() ?? null)
  ctx.watch(composer, service => found.set(service))
  ctx.effect(() =>
    effect(() => {
      parts.pulse.version.get()
      if (shell.current().kind === homeRoute) untrack(() => leaveThreadFolder(parts))
    }),
  )
  ctx.effect(() => shell.route({ kind: homeRoute, render: () => homeScreen(parts, composerView()) }))
  draftingSlots(parts)
}
