import { plural } from '@sand/util'
import type { ToolRenderer, ToolView, ToolViews } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div } from '@vaakx-dev/vrui'
import type { ScriptRun } from '../contract'
import { callViews } from './calls'

interface StepParts {
  kit: Kit
  views: ToolViews
  run(tool: ToolView): ScriptRun | undefined
}

const codeView = ({ codeBlock, fold }: Kit, code: string) => fold({ lines: code.split('\n').length, chars: code.length }, codeBlock({ copy: () => code }, code))

const outputView = (views: ToolViews, tool: ToolView) => tool.result && views.outputText(views.resultText(tool.result) || 'No output', Boolean(tool.result.isError))

const scriptStep = ({ kit, views, run }: StepParts): ToolRenderer => {
  const codeOf = (tool: ToolView) => views.field(tool.call.input, 'code')
  return {
  icon: 'file-code',
  verb: 'Ran script',
  activeVerb: 'Running script',
  label: tool => views.field(tool.call.input, 'title'),
  meta: tool => {
    const count = run(tool)?.calls.length
    return count ? plural(count, 'call') : ''
  },
  copy: codeOf,
  body: tool =>
    div(
      { class: 'flex min-w-0 flex-col gap-2' },
      codeView(kit, codeOf(tool)),
      views.steps(derive(() => callViews(run(tool)))),
      outputView(views, tool),
    ),
  }
}

export { scriptStep }
