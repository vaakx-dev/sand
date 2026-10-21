import type { LogLine } from '@sand/orrin/contract'

const maxChars = 20_000
const tailChars = 15_000
const maxErrorLines = 60
const maxErrorChars = 5_000
const maxErrorLineChars = 500
const errorPattern = /\berror\b|panic|exception|fatal|failed|traceback/i

const display = ({ stream, text }: LogLine) => (stream === 'stderr' ? `! ${text}` : text)

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
    if (!errorPattern.test(line.text)) continue
    const entry = `${line.n}: ${display(line).slice(0, maxErrorLineChars)}`
    if (picked.length === maxErrorLines || chars + entry.length > maxErrorChars) break
    picked.push(entry)
    chars += entry.length + 1
  }
  return picked
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
