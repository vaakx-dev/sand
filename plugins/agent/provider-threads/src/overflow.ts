import { errorMessage } from '@sand/util'

const WINDOW_PATTERNS = [/tokens? > ([\d,]+) maximum/i, /maximum context length is ([\d,]+) tokens/i, /available context size \(([\d,]+) tokens\)/i]

const tokensIn = (digits: string) => Number(digits.replaceAll(',', ''))

export const reportedWindow = (error: unknown) => {
  const message = errorMessage(error)
  const digits = WINDOW_PATTERNS.map(pattern => pattern.exec(message)?.[1]).find(found => found !== undefined)
  return digits ? tokensIn(digits) : undefined
}
