import { errorMessage } from '@sand/kit'

const patterns = [
  /prompt (?:is )?too long/i,
  /request_too_large/i,
  /exceeds? (?:the )?(?:model'?s )?(?:maximum )?context (?:window|length)/i,
  /maximum context length/i,
  /context[_ ](?:length|window)[_ ]exceeded/i,
  /input (?:is )?too long/i,
  /too many (?:input )?tokens/i,
]

export const isOverflow = (error: unknown) => {
  const message = errorMessage(error)
  return patterns.some(pattern => pattern.test(message))
}
