import type { ToolBadge, ToolRenderer, ToolView, ToolViews } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { div, span } from '@vaakx-dev/vrui'
import { isErrorLine, readReport } from '../report'

const thumbnailHeight = 320

const checked = (tool: ToolView) => Boolean(tool.result && !tool.result.isError)

const report = (tool: ToolView) => readReport(tool.result?.content.find(block => block.type === 'text')?.text ?? '')

const screenshotOf = (tool: ToolView) => tool.result?.content.find(block => block.type === 'image')

const consoleLines = (lines: string[]) => lines.map(line => span({ class: isErrorLine(line) ? 'text-danger-400' : '' }, `${line}\n`))

export const previewView = ({ fold }: Kit, { errorBody, field, image, outputText }: ToolViews): ToolRenderer => ({
  icon: 'chart',
  verb: 'Checked',
  activeVerb: 'Checking',
  label: tool => field(tool.call.input, 'path') || 'page',
  meta(tool) {
    if (!checked(tool)) return ''
    const { height, width } = report(tool)
    return `${height}px tall at ${width}px`
  },
  badge(tool): ToolBadge | undefined {
    const errors = checked(tool) ? report(tool).logged.filter(isErrorLine).length : 0
    return errors ? { text: plural(errors, 'console error'), tone: 'danger' } : undefined
  },
  copy: tool => field(tool.call.input, 'path'),
  body(tool) {
    if (!tool.result) return undefined
    if (tool.result.isError) return errorBody(tool)
    const screenshot = screenshotOf(tool)
    const { logged } = report(tool)
    return div(
      { class: 'flex flex-col items-start gap-2' },
      screenshot && image(screenshot, tool.thread, { class: 'block max-h-80 max-w-full rounded-md', maxHeight: thumbnailHeight }),
      logged.length ? fold({ lines: logged.length }, outputText(consoleLines(logged), false)) : outputText('No console output', false),
    )
  },
})
