import type { Artifact, ContextUsage, Limits, LLMEvent, NoticeLevel, ReportRow, ToolCallBlock, ToolResultBlock, Usage, UserContent } from '@sand/protocol'
import { duration, errorMessage, leftOf, percent, plural, reportText } from '@sand/kit'
import { continuation } from './continuation'
import { cyan, dim, red } from './paint'
import { inputSummary, resultSummary } from './tool'

export interface Summary {
  usage: Usage
  limits?: Limits
  context?: ContextUsage
}

export const createPrinter = () => {
  let atLineStart = true
  let started = Date.now()
  const out = (text: string) => {
    if (!text) return
    process.stdout.write(text)
    atLineStart = text.endsWith('\n')
  }
  const err = (text: string) => {
    if (!atLineStart) out('\n')
    process.stderr.write(`${text}\n`)
  }
  return {
    begin() {
      started = Date.now()
    },
    event(event: LLMEvent) {
      if (event.type === 'text') out(event.text)
      else if (event.type === 'block' && event.block.type === 'text' && !atLineStart) out('\n')
      else if (event.type === 'block' && event.block.type === 'thinking' && event.block.thinking) {
        err(dim(event.block.thinking.trim()))
      }
    },
    call(call: ToolCallBlock) {
      err(`${cyan(`● ${call.name}`)} ${dim(inputSummary(call.input))}`)
    },
    result(result: ToolResultBlock) {
      if (result.isError) err(red(`  ✗ ${resultSummary(result)}`))
    },
    artifact({ title, path }: Artifact, remote?: string) {
      err(`${cyan(`◆ ${title}`)} ${dim(remote ? `${path} on ${remote}` : Bun.pathToFileURL(path).href)}`)
    },
    progress(text: string) {
      err(dim(text))
    },
    continued(content: UserContent[]) {
      err(dim(`↻ ${continuation(content)}`))
    },
    waiting(jobs: number) {
      if (jobs) err(dim(`waiting for ${plural(jobs, 'background job')}`))
    },
    notice(text: string, level?: NoticeLevel) {
      err(level === 'error' ? red(text) : text)
    },
    report(title: string, rows: ReportRow[]) {
      if (!atLineStart) out('\n')
      out(`${reportText(title, rows)}\n`)
    },
    done({ usage, limits, context }: Summary) {
      const input = usage.input + usage.cacheRead + usage.cacheWrite
      const left = limits?.windows.map(window => `${window.label.toLowerCase()} ${percent(leftOf(window))}`).join(', ')
      const full = context && `context ${percent(context.used / context.window)}`
      const worked = `worked for ${duration(Date.now() - started)}`
      err(dim([worked, `${input} in (${usage.cacheRead} cached) · ${usage.output} out`, full, left && `${left} left`].filter(Boolean).join(' · ')))
    },
    error(error: unknown) {
      err(red(errorMessage(error)))
    },
  }
}

export type Printer = ReturnType<typeof createPrinter>
