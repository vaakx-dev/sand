import type { GithubCli } from '../contract'
import { gh } from './run'

const needed = { major: 2, minor: 99 }

const commands: Record<string, { install: string; update: string }> = {
  win32: { install: 'winget install --id GitHub.cli', update: 'winget upgrade --id GitHub.cli' },
  darwin: { install: 'brew install gh', update: 'brew upgrade gh' },
  linux: { install: 'sudo apt install gh', update: 'sudo apt install --only-upgrade gh' },
}

const platformCommands = commands[process.platform] ?? commands.linux!

export const parseVersion = (text: string) => {
  const found = text.match(/gh version (\d+)\.(\d+)/)
  if (!found) return undefined
  const major = Number(found[1])
  const minor = Number(found[2])
  return { major, minor, text: `${major}.${minor}` }
}

export const isOld = ({ major, minor }: { major: number; minor: number }) => major < needed.major || (major === needed.major && minor < needed.minor)

export const ghCli = async (): Promise<GithubCli> => {
  const result = await gh(['--version'])
  if (result.code !== 0) return { installed: false, old: false, command: platformCommands.install }
  const version = parseVersion(result.stdout)
  if (!version) return { installed: true, old: false }
  const old = isOld(version)
  return { installed: true, version: version.text, old, ...(old && { command: platformCommands.update }) }
}
