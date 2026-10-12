import type { MenuKit, ToolBadge, ToolStepOptions, ToolView } from '../contract'
import type { MenuSpec } from '@sand/protocol'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, span, untrack, type Sig } from '@vaakx-dev/vrui'

const countTone = (part: string) => {
  if (/^[+]\d+$/.test(part)) return 'text-success-400'
  if (/^−\d+$/.test(part)) return 'text-danger-400'
  return undefined
}

const counts = (text: string) =>
  text.split(/([+]\d+|−\d+)/).map(part => {
    const tone = countTone(part)
    return tone ? span({ class: tone }, part) : part
  })

const metaView = (text: string) => span({ class: 'shrink-0 text-xs text-neutral-500' }, counts(text))

export const toolStep = (kit: Kit, tool: Sig<ToolView>, { renderer, version, open, toggle, menu }: ToolStepOptions, menus: MenuKit) => {
  const { badge, contextMenu, copyButton, icon, shine, toolBody, toolCard } = kit
  const badgeView = (found: ToolBadge | undefined) => found && badge(found.tone, found.text)
  const current = () => renderer(tool.get().call.name)
  const signature = derive(() => {
    const { status, result, call } = tool.get()
    return [status, result ? 1 : 0, JSON.stringify(call.input ?? null).length, version.get()].join(':')
  })
  const shown = derive(() => {
    signature.get()
    const value = untrack(() => tool.get())
    const found = renderer(value.call.name)
    return { icon: found.icon, verb: found.verb, activeVerb: found.activeVerb, label: found.label(value), meta: found.meta(value), badge: found.badge(value) }
  })
  const running = derive(() => ['running', 'pending'].includes(tool.get().status))
  const label = shown.map(value => value.label)
  const copy = () => current().copy(tool.get())
  const body = dynamicChild(
    derive(() => (open.get() ? signature.get() : '')),
    value => {
      const content = value ? current().body(tool.get()) : undefined
      return content && toolBody(content)
    },
  )
  const own = menu ?? contextMenu()
  const spec = (): MenuSpec => ({
    title: shown.get().verb,
    subtitle: shown.get().label,
    actions: [
      ...current().actions(tool.get()),
      menus.copy('copy', 'Copy', copy, 'output'),
      { id: 'toggle', label: open.get() ? 'Collapse' : 'Expand', icon: open.get() ? 'up' : 'down', run: toggle },
    ],
  })
  const press = menus.text(own, spec)
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
      actions: [copyButton({ text: copy }), menus.more(own, spec)],
      onToggle: () => {
        if (!press.held()) toggle()
      },
      headProps: press.props,
    },
    body,
  )
  return menu ? card : div(card, own.view())
}
