import { botName, botRoute } from '@sand/bots/contract'
import type { Route, Screen } from '@sand/ui-shell/contract'
import { derive, div, dynamicChild, effect, list, show, sig, untrack } from '@vaakx-dev/vrui'
import { chatView } from '../chat/view'
import { botMark, statusIcon } from '../marks'
import { projectPage } from '../project/page'
import type { Parts } from '../parts'

const fill = 'flex min-h-0 min-w-0 flex-1 flex-col'

const tabStrip = (parts: Parts, id: string, current: () => string | undefined, refs: () => string[]) => {
  const { kit, shell } = parts.ctx
  const bot = () => parts.store.find(id)
  const close = (ref: string) => {
    parts.tabs.close(id, ref)
    if (current() === ref) shell.open({ kind: botRoute, id }, { replace: true })
  }
  return kit.tabStrip(
    'Bot',
    kit.tab({
      title: () => botName(bot() ?? { name: '' }),
      lead: botMark(kit, bot),
      selected: () => current() === undefined,
      onSelect: () => shell.open({ kind: botRoute, id }),
    }),
    list(
      derive(refs),
      ref => ref,
      ref =>
        kit.tab({
          title: () => parts.work.get(ref.get())?.title ?? '',
          lead: dynamicChild(
            derive(() => parts.work.get(ref.get())?.status ?? 'done'),
            status => statusIcon(kit, status),
          ),
          selected: () => current() === ref.get(),
          onSelect: () => shell.open({ kind: botRoute, id, tab: ref.get() }),
          onClose: () => close(ref.get()),
        }),
      div({ class: 'contents' }),
    ),
  )
}

const phoneHead = (parts: Parts, id: string) => {
  const { kit } = parts.ctx
  const bot = () => parts.store.find(id)
  return kit.plainButton(
    { class: 'flex min-w-0 items-center gap-2 rounded-md px-1', title: 'Profile', onClick: () => parts.profile(id) },
    botMark(kit, bot),
    kit.headTitle(2, () => botName(bot() ?? { name: '' })),
    kit.icon('down', 'sm'),
  )
}

const tabBodies = (parts: Parts, current: () => string | undefined, refs: () => string[]) => {
  const seen = sig(new Set<string>())
  effect(() => {
    const ref = current()
    if (ref && !untrack(() => seen.get()).has(ref)) seen.update(all => new Set([...all, ref]))
  })
  return list(
    derive(refs),
    ref => ref,
    ref =>
      div(
        { class: () => (current() === ref.get() ? fill : 'hidden') },
        dynamicChild(
          derive(() => seen.get().has(ref.get())),
          shown => (shown ? (parts.work.source(ref.get())?.render(ref.get()) ?? null) : null),
        ),
      ),
    div({ class: 'contents' }),
  )
}

const missing = (parts: Parts) =>
  div(
    { class: [fill, 'items-center justify-center px-6'] },
    dynamicChild(
      derive(() => parts.store.bots.get() === undefined),
      loading => (loading ? parts.ctx.kit.loadingState() : parts.ctx.kit.emptyState({ text: 'This bot is gone.' })),
    ),
  )

export const botScreen = (parts: Parts, route: () => Route): Screen => {
  const { kit, shell } = parts.ctx
  const id = untrack(route).id ?? ''
  const tab = () => route().tab
  const known = () => Boolean(parts.store.find(id))
  const refs = () => parts.tabs.of(id).filter(ref => parts.work.source(ref))
  effect(() => {
    const ref = tab()
    if (ref) untrack(() => parts.tabs.add(id, ref))
  })
  return {
    head: () =>
      dynamicChild(
        derive(() => shell.state() === 'phone'),
        phone => (phone ? phoneHead(parts, id) : tabStrip(parts, id, tab, refs)),
      ),
    main: () =>
      div(
        { class: fill },
        show(
          () => !known(),
          () => missing(parts),
        ),
        show(known, () =>
          div(
            { class: fill },
            div({ class: () => (tab() ? 'hidden' : fill) }, chatView({ ctx: parts.ctx, id, bot: () => parts.store.find(id), profile: () => parts.profile(id), resume: () => void parts.store.update(id, { paused: false }).catch(error => parts.ctx.report(error)) })),
            tabBodies(parts, tab, refs),
          ),
        ),
      ),
    side: {
      label: 'Project',
      mainLabel: 'Chat',
      actions: () => kit.iconButton({ title: 'Profile', 'aria-label': 'Profile', onClick: () => parts.profile(id) }, kit.icon('sliders')),
      render: () => projectPage(parts, id),
    },
  }
}
