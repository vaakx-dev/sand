import type { ToolBadge, ToolView } from '@sand/transcript-chat/contract'
import type { MenuKit, ToolStepOptions } from '../contract'
import { badge, contextMenu, copyButton, derive, div, dynamicChild, icon, shine, span, toolBody, toolCard, untrack, type Sig } from '@sand/dom'

const counts = (text: string) =>
  text
    .split(/([+]\d+|−\d+)/)
    .map(part => (/^[+]\d+$/.test(part) ? span({ class: 'text-success-400' }, part) : /^−\d+$/.test(part) ? span({ class: 'text-danger-400' }, part) : part))

const badgeView = (found: ToolBadge | undefined) => (found ? badge(found.tone, found.text) : span({ class: 'hidden' }))

const metaView = (text: string) => span({ class: 'shrink-0 text-xs text-neutral-500' }, counts(text))

export const toolStep = (tool: Sig<ToolView>, { renderer, version, open, toggle, menu }: ToolStepOptions, menus: MenuKit) => {
  const signature = derive(() => {
    const current = tool.get()
    return [current.status, current.result ? 1 : 0, JSON.stringify(current.call.input ?? null).length, version.get()].join(':')
  })
  const shown = derive(() => {
    signature.get()
    return untrack(() => {
      const current = tool.get()
      const found = renderer(current.call.name)
      return { icon: found.icon, verb: found.verb, activeVerb: found.activeVerb, label: found.label(current), meta: found.meta(current), badge: found.badge(current) }
    })
  })
  const running = derive(() => ['running', 'pending'].includes(tool.get().status))
  const label = shown.map(value => value.label)
  const body = dynamicChild(
    derive(() => (open.get() ? signature.get() : '')),
    value => {
      const content = value ? renderer(tool.get().call.name).body(tool.get()) : undefined
      return content ? toolBody(content) : div({ class: 'hidden' })
    },
  )
  const own = menu ?? contextMenu()
  const press = menus.text(
    own,
    () => ({
      title: shown.get().verb,
      subtitle: shown.get().label,
      actions: [
        ...renderer(tool.get().call.name).actions(tool.get()),
        menus.copy('copy', 'Copy', () => renderer(tool.get().call.name).copy(tool.get()), 'output'),
        { id: 'toggle', label: open.get() ? 'Collapse' : 'Expand', icon: open.get() ? 'up' : 'down', run: toggle },
      ],
    }),
    node => node.firstElementChild?.firstElementChild ?? null,
  )
  const card = toolCard(
    {
      icon: dynamicChild(
        shown.map(value => value.icon),
        name => icon(name, 14),
      ),
      verb: () => (running.get() ? shown.get().activeVerb : shown.get().verb),
      target: dynamicChild(running, live => (live ? shine(label) : span(label))),
      targetTitle: label,
      meta: [
        dynamicChild(
          shown.map(value => value.meta),
          metaView,
        ),
        dynamicChild(
          shown.map(value => value.badge),
          badgeView,
        ),
      ],
      failed: derive(() => tool.get().status === 'failed'),
      actions: copyButton({ text: () => renderer(tool.get().call.name).copy(tool.get()) }),
      onToggle: () => {
        if (!press.held()) toggle()
      },
    },
    body,
  )
  return div(press.props, card, !menu && own.view())
}
