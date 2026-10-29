import type { MenuKit, ToolBadge, ToolStepOptions, ToolView } from '../contract'
import type { Kit, MenuSpec } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show, span, untrack, type Sig } from '@vaakx-dev/vrui'
import { relativeTo } from './relative'

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

const progressTail = (lines: string[]) =>
  div({ class: 'font-mono text-xs text-neutral-500' }, lines.map(line => div({ class: 'truncate whitespace-pre' }, line || ' ')))

const inputSize = () => {
  let seen: unknown = Symbol()
  let size = 0
  return (input: unknown) => {
    if (input !== seen) {
      seen = input
      size = JSON.stringify(input ?? null).length
    }
    return size
  }
}

const metaView = (text: string) => span({ class: 'max-w-1/2 shrink-0 truncate text-xs text-neutral-500', title: text }, counts(text))

export const toolStep = (
  kit: Kit,
  tool: Sig<ToolView>,
  { renderer, version, open, toggle, menu }: ToolStepOptions,
  menus: MenuKit,
  cwdOf: (thread: string) => string | undefined,
) => {
  const { badge, contextMenu, copyButton, icon, shine, toolBody, toolCard } = kit
  const badgeView = (found: ToolBadge | undefined) => found && badge(found.tone, found.text)
  const current = () => renderer(tool.get().call.name)
  const sizeOf = inputSize()
  const signature = derive(() => {
    const { status, result, call } = tool.get()
    return [status, result ? 1 : 0, sizeOf(call.input), version.get()].join(':')
  })
  const shown = derive(() => {
    signature.get()
    const value = untrack(() => tool.get())
    const found = renderer(value.call.name)
    return { icon: found.icon, verb: found.verb, activeVerb: found.activeVerb, label: relativeTo(cwdOf(value.thread), found.label(value)), meta: found.meta(value), badge: found.badge(value) }
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
  const tail = dynamicChild(
    derive(() => (running.get() ? tool.get().progress : undefined)),
    lines => (lines?.length ? toolBody(progressTail(lines)) : undefined),
  )
  const own = menu ?? contextMenu()
  const spec = (): MenuSpec => ({
    title: shown.get().verb,
    subtitle: shown.get().label,
    actions: [
      ...current().actions(tool.get()),
      { id: 'toggle', label: open.get() ? 'Collapse' : 'Expand', icon: open.get() ? 'up' : 'down', run: toggle },
    ],
  })
  const press = menus.text(own, spec)
  const card = toolCard(
    {
      icon: dynamicChild(
        shown.map(value => value.icon),
        name => icon(name, 'sm'),
      ),
      verb: () => (running.get() ? shown.get().activeVerb : shown.get().verb),
      target: dynamicChild(running, live => (live ? shine(label) : span(label))),
      targetClass: 'font-mono text-neutral-400',
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
      expanded: open,
      actions: [
        copyButton({ text: copy }),
        show(
          () => current().actions(tool.get()).length > 0,
          () => menus.more(own, spec),
        ),
      ],
      onToggle: () => {
        if (!press.held()) toggle()
      },
      headProps: press.props,
    },
    body,
    tail,
  )
  return menu ? card : div(card, own.view())
}
