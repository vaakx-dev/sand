import { composer as composerService, type Composer } from '@sand/composer/contract'
import { modelTargets } from '@sand/model-panel/contract'
import { palette } from '@sand/palette/contract'
import { owned, type Pulse } from '@sand/reactive'
import type { Kit } from '@sand/ui-kit/contract'
import { homeRoute } from '@sand/ui-shell/contract'
import { dynamicChild, effect, sig, untrack } from '@vaakx-dev/vrui'
import { newChatPage } from '../palette/projects'
import { newThreadHome, type HomeHeadPart } from '../contract'
import { currentPick } from './picks'
import { newThreadScreen } from './screen'
import { startChat, type StartParts } from './start'

export interface LaunchParts extends StartParts {
  kit: Kit
  pulse: Pulse
}

export const newThread = (parts: StartParts) => {
  const found = parts.ctx.get(palette)
  if (found) return found.open(newChatPage(parts))
  const { path, device } = currentPick(parts.ctx, parts.threads)
  startChat(parts, path, device)
}

export const launch = (parts: LaunchParts) => {
  const { ctx, kit, shell, threads, pulse } = parts
  const pick = owned(ctx, () => pulse.read(() => currentPick(ctx, threads)))
  const showing = () => shell.current().kind === homeRoute
  const found = sig<Composer | undefined>(undefined)
  const head = sig<HomeHeadPart[]>([])
  ctx.watch(composerService, service => found.set(service))
  ctx.watch(composerService, service => service?.placeholder(() => (showing() ? 'Describe the change.' : undefined)))

  ctx.effect(() =>
    effect(() => {
      if (!showing()) return
      const { path, device } = pick.get()
      const draft = threads.drafting()
      if (threads.current() || (draft?.cwd === path && draft.device === device)) return
      untrack(() => void threads.draft(path, device, draft?.id, { replace: Boolean(draft) }))
    }),
  )

  const screen = () =>
    newThreadScreen({
      kit,
      head,
      composer: () => dynamicChild(found, service => service?.view() ?? null),
      counts: scope => shell.chipBar(scope),
    })
  ctx.provide(newThreadHome, {
    project: () => pick.get(),
    chooseProject: () => newThread(parts),
    head(part) {
      head.update(all => [...all, part])
      return () => head.update(all => all.filter(other => other !== part))
    },
  })
  ctx.effect(() =>
    shell.subject(({ kind }) => {
      pulse.version.get()
      const draft = threads.drafting()
      return kind === homeRoute && draft ? { session: draft.id, owner: 'thread', device: draft.device, ...(draft.cwd && { cwd: draft.cwd }), draft: true } : undefined
    }),
  )
  ctx.watch(modelTargets, targets =>
    targets?.source(({ session }) => {
      pulse.version.get()
      const composer = found.get()
      return composer && threads.drafting()?.id === session ? { settings: composer.settings, choose: composer.choose } : undefined
    }),
  )
  ctx.effect(() => shell.route({ kind: homeRoute, render: screen }))
}
