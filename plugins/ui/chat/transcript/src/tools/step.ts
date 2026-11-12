import type { ToolBadge, ToolStatus, ToolStepOptions, ToolView } from '../contract'
import type { Kit, MenuSpec } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show, span, untrack, type Sig } from '@vaakx-dev/vrui'
import { stepBody, stepLine, stepMark, type StepState } from '../rows/line'
import { relativeTo } from './relative'

const states: Record<ToolStatus, StepState> = { pending: 'running', running: 'running', done: 'done', failed: 'failed' }

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

const metaView = (text: string) => span({ class: 'truncate', title: text }, counts(text))

const badgeTones: Record<ToolBadge['tone'], string> = { danger: 'text-danger-400', neutral: 'text-neutral-500' }

const badgeView = (found: ToolBadge | undefined) => found && span({ class: ['shrink-0', badgeTones[found.tone]] }, found.text)

export const toolStep = (
  kit: Kit,
  tool: Sig<ToolView>,
  { renderer, version, open, toggle, menu }: ToolStepOptions,
  cwd: string | undefined,
) => {
  const { contextMenu, copyButton, shine } = kit
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
    return { verb: found.verb, activeVerb: found.activeVerb, label: relativeTo(cwd, found.label(value)), meta: found.meta(value), badge: found.badge(value) }
  })
  const state = derive(() => states[tool.get().status])
  const running = derive(() => state.get() === 'running')
  const verb = derive(() => (running.get() ? shown.get().activeVerb : shown.get().verb))
  const label = derive(() => [verb.get(), shown.get().label].filter(Boolean).join(' '))
  const copy = () => current().copy(tool.get())
  const body = dynamicChild(
    derive(() => (open.get() ? signature.get() : '')),
    value => {
      const content = value ? current().body(tool.get()) : undefined
      return content && stepBody(content)
    },
  )
  const tail = dynamicChild(
    derive(() => (running.get() ? tool.get().progress : undefined)),
    lines => (lines?.length ? stepBody(progressTail(lines)) : undefined),
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
  const line = stepLine(
    kit,
    {
      mark: dynamicChild(state, value => stepMark(kit, value, current().icon)),
      label: [
        dynamicChild(running, live => (live ? shine(verb) : span({ class: 'shrink-0' }, verb))),
        span({ class: 'min-w-0 truncate font-mono text-xs text-neutral-100' }, () => shown.get().label),
      ],
      title: label,
      meta: span(
        { class: 'ml-auto flex max-w-1/2 shrink-0 gap-2 pl-2 text-xs text-neutral-500 tabular-nums' },
        dynamicChild(
          shown.map(value => value.badge),
          badgeView,
        ),
        dynamicChild(
          shown.map(value => value.meta),
          metaView,
        ),
      ),
      expanded: open,
      actions: [
        copyButton({ text: copy }),
        show(
          () => current().actions(tool.get()).length > 0,
          () => own.button(spec, { size: 'sm' }),
        ),
      ],
      onToggle: toggle,
      headProps: own.target(spec, undefined, 'text'),
    },
    body,
    tail,
  )
  return menu ? line : div(line, own.view())
}
