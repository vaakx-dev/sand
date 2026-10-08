import type { ToolBadge, ToolRenderer, ToolView } from '@sand/protocol'
import { errorBody, field, resultText, truncatedNote } from '@sand/conversation'
import { div, el, fold, span } from '@sand/dom'

const shownLines = 400
const trailer = /\n?\[exit code (-?\d+)(, timed out)?\]\s*$/

const command = (tool: ToolView) => field(tool.call.input, 'command')

const parse = (tool: ToolView) => {
  const text = resultText(tool.result)
  const found = trailer.exec(text)
  return { output: found ? text.slice(0, found.index) : text, code: found ? Number(found[1]) : undefined, timedOut: Boolean(found?.[2]) }
}

const fullCommand = (tool: ToolView) =>
  div({ class: 'mb-2 whitespace-pre-wrap wrap-anywhere font-mono text-xs text-neutral-300' }, span({ class: 'text-accent-400' }, '$ '), command(tool))

export const shellRenderer: ToolRenderer = {
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
    if (tool.result.isError) return { text: 'failed', tone: 'danger' }
    const { code, timedOut } = parse(tool)
    if (timedOut) return { text: 'timed out', tone: 'danger' }
    return code === undefined ? undefined : { text: `exit ${code}`, tone: code === 0 ? 'success' : 'danger' }
  },
  copy: command,
  body(tool) {
    if (!tool.result) return command(tool).includes('\n') ? fullCommand(tool) : undefined
    if (tool.result.isError) return div(command(tool).includes('\n') && fullCommand(tool), errorBody(tool))
    const { output, code } = parse(tool)
    const lines = output.split('\n')
    const hidden = Math.max(0, lines.length - shownLines)
    const shown = lines.slice(hidden).join('\n') || '(no output)'
    const failed = (code ?? 0) !== 0
    return div(
      command(tool).includes('\n') && fullCommand(tool),
      hidden > 0 && truncatedNote(hidden, 'before'),
      fold(
        { lines: lines.length - hidden, chars: shown.length, copy: () => output },
        el('pre', { class: ['whitespace-pre-wrap wrap-anywhere font-mono text-xs', failed ? 'text-danger-400' : 'text-neutral-300'] }, shown),
      ),
    )
  },
}
