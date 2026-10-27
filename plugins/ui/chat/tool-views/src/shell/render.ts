import type { ToolBadge, ToolRenderer, ToolView, ToolViews } from '@sand/chat/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'

const shownLines = 400
const trailer = /\n?\[exit code (-?\d+)(, timed out)?\]\s*$/

const parse = (text: string) => {
  const found = trailer.exec(text)
  return { output: found ? text.slice(0, found.index) : text, code: found ? Number(found[1]) : undefined, timedOut: Boolean(found?.[2]) }
}

export const shellRenderer = ({ fold, statusLabel }: Kit, { errorBody, field, outputText, resultText, truncatedNote }: ToolViews): ToolRenderer => {
  const command = (tool: ToolView) => field(tool.call.input, 'command')
  const multiline = (tool: ToolView) => command(tool).includes('\n') && div({ class: 'mb-2' }, outputText([span({ class: 'text-neutral-500' }, '$ '), command(tool)], false))
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
      const { code, timedOut } = parse(resultText(tool.result))
      if (timedOut) return { text: 'Timed out', tone: 'danger' }
      return code === undefined || code === 0 ? undefined : { text: `Exit ${code}`, tone: 'danger' }
    },
    copy: command,
    body(tool) {
      if (!tool.result) return multiline(tool) || undefined
      if (tool.result.isError) return div(multiline(tool), errorBody(tool))
      const { output } = parse(resultText(tool.result))
      const lines = output.split('\n')
      const hidden = Math.max(0, lines.length - shownLines)
      const shown = lines.slice(hidden).join('\n') || 'No output'
      return div(
        multiline(tool),
        hidden > 0 && truncatedNote(hidden, 'before'),
        fold({ lines: lines.length - hidden, chars: shown.length }, outputText(shown, false)),
      )
    },
  }
}
