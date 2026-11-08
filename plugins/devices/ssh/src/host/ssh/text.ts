import { oneLine } from '@sand/util'

const ansi = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07/g

const noise = [/^Warning: Permanently added/i, /^@+$/, /^Pseudo-terminal will not be allocated/i, /^Connection to .* closed/i]

const changedKey = /REMOTE HOST IDENTIFICATION HAS CHANGED/i

const errorLength = 300

export const stripAnsi = (text: string) => text.replace(ansi, '')

const redact = (text: string, secrets: string[]) => secrets.filter(Boolean).reduce((clean, secret) => clean.replaceAll(secret, '•••'), text)

const cleanLines = (output: string) =>
  stripAnsi(output)
    .split(/\r?\n/)
    .map(line => line.replace(/^@\s*|\s*@$/g, '').trim())
    .filter(line => line && !noise.some(pattern => pattern.test(line)))

const shortError = (lines: string[]) => {
  if (!lines.some(line => changedKey.test(line))) return lines.at(-1) ?? ''
  const offending = lines.find(line => /^Offending .* key in /i.test(line))
  return ['WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!', offending, lines.at(-1)].filter(Boolean).join(' ')
}

export const sshErrorText = (output: string, secrets: string[]) => oneLine(redact(shortError(cleanLines(output)), secrets), errorLength)
