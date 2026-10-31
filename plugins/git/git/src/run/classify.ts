import type { GitFailure, GitResult } from '../contract'
import { GitError } from './error'

const failures: [GitFailure, RegExp][] = [
  ['not-a-repo', /not a git repository/i],
  ['locked', /index\.lock|unable to create '.*\.lock'/i],
  ['auth', /authentication failed|could not read (username|password)|permission denied \(publickey|returned error: 40[13]/i],
  ['no-upstream', /has no upstream branch|no upstream configured|there is no tracking information/i],
  ['dirty', /would be overwritten|please commit your changes or stash them/i],
  ['conflict', /^CONFLICT|unmerged|fix conflicts/i],
  ['rejected', /\[(remote )?rejected\]|non-fast-forward|fetch first|updates were rejected/i],
  ['not-found', /pathspec .* did not match|unknown revision|bad revision|not a valid object name|couldn't find remote ref|invalid reference|does not appear to be a git repository|repository .*not found/i],
]

const noise = /^(warning|hint):/i

const linesOf = ({ err, out }: GitResult) =>
  `${err}\n${out}`
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !noise.test(line))

const firstFailure = (lines: string[]) => {
  for (const [reason, pattern] of failures) {
    const line = lines.find(text => pattern.test(text))
    if (line) return { reason, line }
  }
  return undefined
}

const cleaned = (line: string) => line.replace(/^(fatal|error|!)\s*:?\s*/i, '').replace(/\s+/g, ' ')

export const classify = (result: GitResult, args: string[]): GitError => {
  const lines = linesOf(result)
  const failure = firstFailure(lines)
  const line = failure?.line ?? lines.find(text => /^(fatal|error):/.test(text)) ?? lines[0]
  const detail = line ? cleaned(line) : undefined
  return new GitError(failure?.reason ?? 'unknown', detail || `git ${args[0]} failed`, detail)
}
