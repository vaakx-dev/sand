import type { ToolBadge, ToolRenderer, ToolView } from '@sand/transcript-chat/contract'
import type { ToolViews } from '@sand/transcript-parts/contract'
import { div, el, fold, span } from '@sand/dom'

const shownLines = 400
const trailer = /\n?\[exit code (-?\d+)(, timed out)?\]\s*$/

const parse = (text: string) => {
  const found = trailer.exec(text)
  return { output: found ? text.slice(0, found.index) : text, code: found ? Number(found[1]) : undefined, timedOut: Boolean(found?.[2]) }
}

const fullCommand = (command: string) =>
  div({ class: 'mb-2 whitespace-pre-wrap wrap-anywhere font-mono text-xs text-neutral-300' }, span({ class: 'text-accent-400' }, '$ '), command)

export const shellRenderer = ({ errorBody, field, resultText, truncatedNote }: ToolViews): ToolRenderer => {
  const command = (tool: ToolView) => field(tool.call.input, 'command')
  const multiline = (tool: ToolView) => command(tool).includes('\n') && fullCommand(command(tool))
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
      if (tool.result.isError) return { text: 'failed', tone: 'danger' }
      const { code, timedOut } = parse(resultText(tool.result))
      if (timedOut) return { text: 'timed out', tone: 'danger' }
      return code === undefined ? undefined : { text: `exit ${code}`, tone: code === 0 ? 'success' : 'danger' }
    },
    copy: command,
    body(tool) {
      if (!tool.result) return multiline(tool) || undefined
      if (tool.result.isError) return div(multiline(tool), errorBody(tool))
      const { output, code } = parse(resultText(tool.result))
      const lines = output.split('\n')
      const hidden = Math.max(0, lines.length - shownLines)
      const shown = lines.slice(hidden).join('\n') || '(no output)'
      const failed = (code ?? 0) !== 0
      return div(
        multiline(tool),
        hidden > 0 && truncatedNote(hidden, 'before'),
        fold(
          { lines: lines.length - hidden, chars: shown.length, copy: () => output },
          el('pre', { class: ['whitespace-pre-wrap wrap-anywhere font-mono text-xs', failed ? 'text-danger-400' : 'text-neutral-300'] }, shown),
        ),
      )
    },
  }
}
