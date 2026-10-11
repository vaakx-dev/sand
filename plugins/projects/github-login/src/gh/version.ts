import type { GithubCli } from '../contract'
import { gh } from './run'

const needed = { major: 2, minor: 99 }

interface Commands {
  install: string
  update: string
}

const linux: Commands = { install: 'sudo apt install gh', update: 'sudo apt install --only-upgrade gh' }

const byPlatform: Record<string, Commands> = {
  win32: { install: 'winget install --id GitHub.cli', update: 'winget upgrade --id GitHub.cli' },
  darwin: { install: 'brew install gh', update: 'brew upgrade gh' },
}

const commands = byPlatform[process.platform] ?? linux

const parseVersion = (text: string) => {
  const found = text.match(/gh version (\d+)\.(\d+)/)
  if (!found) return undefined
  const major = Number(found[1])
  const minor = Number(found[2])
  return { major, minor, text: `${major}.${minor}` }
}

const isOld = ({ major, minor }: { major: number; minor: number }) => major < needed.major || (major === needed.major && minor < needed.minor)

export const ghCli = async (): Promise<GithubCli> => {
  const result = await gh(['--version'])
  if (result.code !== 0) return { installed: false, old: false, command: commands.install }
  const version = parseVersion(result.stdout)
  if (!version) return { installed: true, old: false }
  const old = isOld(version)
  return { installed: true, version: version.text, old, ...(old && { command: commands.update }) }
}
