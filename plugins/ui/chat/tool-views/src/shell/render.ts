import type { ToolBadge, ToolRenderer, ToolView, ToolViews } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { div, span } from '@vaakx-dev/vrui'

const shownLines = 400
const trailer = /\n?\[exit code (-?\d+)(?:, stopped: ([^\]]+))?\]\s*$/

const parse = (text: string) => {
  const found = trailer.exec(text)
  return { output: found ? text.slice(0, found.index) : text, code: found ? Number(found[1]) : undefined, stopped: found?.[2] }
}

export const shellRenderer = ({ codeBlock, fold, metaLine, statusLabel }: Kit, { errorBody, field, resultText, truncatedNote }: ToolViews): ToolRenderer => {
  const command = (tool: ToolView) => field(tool.call.input, 'command')
  const multiline = (tool: ToolView) => command(tool).includes('\n') && div({ class: 'mb-2' }, codeBlock({}, span({ class: 'text-neutral-500' }, '$ '), tildeHome(command(tool))))
  return {
    icon: 'term',
    verb: 'Ran',
    activeVerb: 'Running',
    label(tool) {
      const value = command(tool)
      const first = value.split('\n')[0] ?? ''
      return value.includes('\n') ? `${first} …` : first
    },
    meta: () => '',
    badge(tool): ToolBadge | undefined {
      if (!tool.result) return undefined
      if (tool.result.isError) return { text: statusLabel('failed'), tone: 'danger' }
      const { code, stopped } = parse(resultText(tool.result))
      if (stopped) return { text: 'stopped', tone: 'danger' }
      return code === undefined || code === 0 ? undefined : { text: `exit ${code}`, tone: 'danger' }
    },
    copy: command,
    body(tool) {
      if (!tool.result) return multiline(tool) || undefined
      if (tool.result.isError) return div(multiline(tool), errorBody(tool))
      const { output, stopped } = parse(resultText(tool.result))
      const lines = output.split('\n')
      const hidden = Math.max(0, lines.length - shownLines)
      const shown = lines.slice(hidden).join('\n')
      return div(
        multiline(tool),
        hidden > 0 && truncatedNote(hidden, 'before'),
        shown ? fold({ lines: lines.length - hidden, chars: shown.length }, codeBlock({}, tildeHome(shown))) : div({ class: 'flex' }, metaLine('No output')),
        stopped && div({ class: 'mt-1 flex' }, metaLine(`Stopped: ${stopped}`)),
      )
    },
  }
}
