import type { OpenState, Step } from '../contract'
import type { Kit } from '@sand/ui-kit/contract'
import { list, untrack, type Sig } from '@vaakx-dev/vrui'
import { row, workFrame, type RowContext, type RowMaker } from './row'
import { thinkingStep } from './thinking'
import { toolStep } from '../tools/step'

type ThinkingStep = Extract<Step, { kind: 'thinking' }>

const thinkingView = (kit: Kit, step: Sig<ThinkingStep>, state: OpenState) =>
  thinkingStep(kit, { streaming: step.map(value => value.streaming), text: step.map(value => value.text), ...state })

const stepView = (step: Sig<Step>, context: RowContext) => {
  const first = untrack(() => step.get())
  const state = context.states.get(first.key)
  if (first.kind === 'thinking') return thinkingView(context.kit, step.map(value => (value.kind === 'thinking' ? value : first)), state)
  const { kit, registry, menus, menu, cwd } = context
  return toolStep(
    kit,
    step.map(value => (value.kind === 'tool' ? value.tool : first.tool)),
    { renderer: registry.toolRenderer, version: registry.version, ...state, menu },
    menus,
    cwd,
  )
}

export const toolsRow: RowMaker<'tools'> = (item, context) =>
  row(`tools:${item.key}`, item, data =>
    list(
      data.map(value => value.steps),
      step => `${step.kind}:${step.key}`,
      step => stepView(step, context),
      workFrame(),
    ),
  )
