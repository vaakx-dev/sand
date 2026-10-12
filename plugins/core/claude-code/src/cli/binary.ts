import { homedir } from 'node:os'
import { join } from 'node:path'

const installed = join(homedir(), '.local', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude')

export const installUrl = 'https://code.claude.com/docs/en/setup'

export const findClaude = async () => Bun.which('claude') ?? ((await Bun.file(installed).exists()) ? installed : undefined)

export const requireClaude = async () => {
  const found = await findClaude()
  if (!found) throw new Error(`Claude Code isn't installed on this PC. Install it from ${installUrl}, sign in with \`claude\`, then try again.`)
  return found
}
