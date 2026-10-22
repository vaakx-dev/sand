import type { LogLine } from '@sand/orrin/contract'

const maxChars = 20_000
const tailChars = 15_000
const maxErrorLines = 60
const maxErrorChars = 5_000
const maxErrorLineChars = 500
const errorPattern = /\berror\b|panic|exception|fatal|failed|traceback/i
const ansi = /\x1b\[[0-9;]*m/g

const display = ({ stream, text }: LogLine) => {
  const plain = text.replace(ansi, '')
  return stream === 'stderr' ? `! ${plain}` : plain
}

const omittedLines = (lines: LogLine[], omittedChars: number) => {
  let offset = 0
  const omitted: LogLine[] = []
  for (const line of lines) {
    offset += display(line).length + 1
    if (offset > omittedChars) break
    omitted.push(line)
  }
  return omitted
}

const errorLines = (lines: LogLine[]) => {
  const picked: string[] = []
  let chars = 0
  for (const line of lines) {
    if (!errorPattern.test(display(line))) continue
    const entry = `${line.n}: ${display(line).slice(0, maxErrorLineChars)}`
    if (picked.length === maxErrorLines || chars + entry.length > maxErrorChars) break
    picked.push(entry)
    chars += entry.length + 1
  }
  return picked
}

const linesAfterError = 3
const lastLines = 10
const maxFailureChars = 4_000

const errorBlocks = (texts: string[]) => {
  const picked = new Set<number>()
  texts.forEach((text, index) => {
    if (!errorPattern.test(text)) return
    for (let next = index; next <= index + linesAfterError && next < texts.length; next++) picked.add(next)
  })
  return texts.filter((_, index) => picked.has(index))
}

const capped = (texts: string[]) => {
  const kept: string[] = []
  let chars = 0
  for (const text of texts) {
    if (chars + text.length > maxFailureChars) return [...kept, `… ${texts.length - kept.length} more lines`]
    kept.push(text)
    chars += text.length + 1
  }
  return kept
}

export const failureLines = (lines: LogLine[]) => {
  const texts = lines.map(line => display(line).slice(0, maxErrorLineChars))
  const errors = errorBlocks(texts)
  return capped(errors.length ? errors : texts.slice(-lastLines))
}

export const logTail = (lines: LogLine[]) => {
  const text = lines.map(display).join('\n')
  if (text.length <= maxChars) return text
  const omittedChars = text.length - tailChars
  const errors = errorLines(omittedLines(lines, omittedChars))
  return [
    `… ${omittedChars} characters omitted …`,
    errors.length ? `Error lines from the omitted part:\n${errors.join('\n')}` : '',
    `End of the log:\n${text.slice(-tailChars)}`,
  ]
    .filter(Boolean)
    .join('\n')
}
