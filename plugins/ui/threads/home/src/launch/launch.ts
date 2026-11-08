import { draftRoute } from '@sand/chat/contract'
import { composer, type Composer } from '@sand/composer/contract'
import { palette } from '@sand/palette/contract'
import type { Pulse } from '@sand/reactive'
import type { Kit } from '@sand/ui-kit/contract'
import { homeRoute, type Screen } from '@sand/ui-shell/contract'
import type { Threads } from '@sand/web-client/contract'
import { div, dynamicChild, effect, h1, sig, untrack, type Child } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { currentPlace } from '../palette/places'
import { newChatPage } from '../palette/projects'
import { lastChosen, startChat, type StartParts } from './start'

export interface LaunchParts extends StartParts {
  kit: Kit
  pulse: Pulse
}

const homeScreen = ({ ctx, kit, threads, pulse }: LaunchParts, composerHere: Child): Screen => ({
  head: () => [h1({ class: 'sr-only' }, 'New chat'), kit.barTitle(pulse.read(() => projectOf(ctx, threads)))],
  main: () =>
    div(
      { class: 'flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-24' },
      div({ class: [kit.pageColumn, 'flex flex-col'] }, composerHere),
    ),
})

const projectOf = (ctx: Context, threads: Threads) => {
  const place = currentPlace(ctx, threads)
  return place.path ? place.name : ''
}

const startInLastChosen = ({ threads }: LaunchParts) => {
  const draft = threads.drafting()
  if (!draft) return
  const { path, device } = lastChosen(threads)
  if (draft.cwd !== path || draft.device !== device) void threads.draft(path, device, draft.id, { replace: true })
}

const chipsWhileDrafting = ({ ctx, shell, threads, pulse }: LaunchParts) => {
  const drafting = pulse.read(() => !threads.current())
  return ctx.watch(composer, found => {
    if (!found) return
    return effect(() => {
      if (!drafting.get()) return
      const off = found.slot('above', () => shell.chipBar({ kind: 'general' }))
      return () => void off()
    })
  })
}

export const newChat = (parts: LaunchParts) => {
  const found = parts.ctx.get(palette)
  if (found) return found.open(newChatPage(parts))
  const { path, device } = lastChosen(parts.threads)
  void startChat(parts, path, device)
}

export const isNewChat = ({ shell }: LaunchParts) => {
  const { kind } = shell.current()
  return shell.state() !== 'phone' && (kind === homeRoute || kind === draftRoute)
}

export const launch = (parts: LaunchParts) => {
  const { ctx, shell } = parts
  const found = sig<Composer | undefined>(undefined)
  const composerView = () => dynamicChild(found, composer => composer?.view() ?? null)
  ctx.watch(composer, service => found.set(service))
  ctx.effect(() =>
    effect(() => {
      parts.pulse.version.get()
      if (shell.current().kind === homeRoute && shell.state() !== 'phone') untrack(() => startInLastChosen(parts))
    }),
  )
  ctx.effect(() => shell.route({ kind: homeRoute, render: () => homeScreen(parts, composerView()) }))
  chipsWhileDrafting(parts)
}
