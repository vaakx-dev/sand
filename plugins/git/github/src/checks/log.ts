interface Line {
  text: string
  continued: boolean
}

interface FailedTest {
  name: string
  error: string[]
}

const mostTests = 5
const mostLines = 8
const widest = 200

const timestamp = /^\d{4}-\d\d-\d\dT[\d:.]+Z ?/
const colors = new RegExp('\u001b\\[[0-9;]*m', 'g')
const workspace = /(?:\/home\/runner\/work|[A-Z]:\\a)[\\/][^\\/\s]+[\\/][^\\/\s]+[\\/]/g
const command = /^##\[\w+\]/
const stepStart = '##[group]Run '
const stepEnd = '##[endgroup]'
const annotation = '##[error]'
const failMark = '(fail) '
const testResult = /^\((?:pass|fail|skip|todo)\) /
const failedSummary = /^\s*\d+ tests? failed:$/
const testDuration = / \[[\d.]+m?s\]$/
const sourceLine = /^\d+ \| /
const caret = /^\s*\^\s*$/
const frame = /^\s*at (?:.*? \()?(.*?)\)?$/

const linesOf = (log: string): Line[] =>
  log.split(/\r?\n/).map(raw => {
    const plain = raw.replace(colors, '')
    return { text: plain.replace(timestamp, '').replace(workspace, ''), continued: !timestamp.test(plain) }
  })

const failedStepOutput = (lines: Line[]) => {
  const end = lines.findLastIndex(line => line.text.startsWith(annotation))
  const start = lines.slice(0, end).findLastIndex(line => line.text.startsWith(stepStart))
  if (end < 0 || start < 0) return []
  const header = lines.slice(start, end).findIndex(line => line.text === stepEnd)
  return lines.slice(start + header + 1, end + 1)
}

const clip = (text: string) => (text.length > widest ? `${text.slice(0, widest)}…` : text)

const shown = (texts: string[]) => texts.map(text => clip(text.trim()))

const headAndTail = (texts: string[]) => {
  const half = mostLines / 2
  return texts.length <= mostLines ? texts : [...texts.slice(0, half), '…', ...texts.slice(-half)]
}

const noise = ({ text, continued }: Line) => continued || !text.trim() || command.test(text) || caret.test(text)

const firstFrameOnly = (texts: string[]) => {
  const first = texts.findIndex(text => frame.test(text))
  return texts.filter((text, index) => !frame.test(text) || index === first).map(text => text.replace(frame, 'at $1'))
}

const errorBefore = (output: Line[], index: number) => {
  const block = output.slice(0, index)
  const testStart = block.findLastIndex(line => testResult.test(line.text) || line.text.startsWith('##[group]'))
  const from = Math.max(testStart, block.findLastIndex(line => sourceLine.test(line.text))) + 1
  const said = output.slice(from, index).filter(line => !noise(line)).map(line => line.text)
  return shown(headAndTail(firstFrameOnly(said)))
}

const testOutput = (output: Line[]) => {
  const summary = output.findIndex(line => failedSummary.test(line.text))
  return summary < 0 ? output : output.slice(0, summary)
}

const failedTests = (output: Line[]): FailedTest[] =>
  testOutput(output).flatMap((line, index) =>
    line.text.startsWith(failMark) ? [{ name: clip(line.text.slice(failMark.length).replace(testDuration, '')), error: errorBefore(output, index) }] : [],
  )

const stepTail = (output: Line[]) => {
  const said = output.map(line => line.text.replace(annotation, '')).filter(text => text.trim() && !command.test(text))
  return shown(said.slice(-mostLines))
}

const testReport = (step: string, tests: FailedTest[]) => {
  const hidden = tests.length - mostTests
  return [
    `${step}: ${tests.length} ${tests.length === 1 ? 'test' : 'tests'} failed`,
    ...tests.slice(0, mostTests).flatMap(test => [`✗ ${test.name}`, ...test.error.map(text => `  ${text}`)]),
    ...(hidden > 0 ? [`… and ${hidden} more`] : []),
  ]
}

const explainLog = (log: string, step = 'A step') => {
  const output = failedStepOutput(linesOf(log))
  if (!output.length) return []
  const tests = failedTests(output)
  if (tests.length) return testReport(step, tests)
  return [`${step} failed:`, ...stepTail(output).map(text => `  ${text}`)]
}

export { explainLog }
