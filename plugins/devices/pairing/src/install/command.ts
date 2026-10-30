import { installJoinEnv, type InstallPlatform } from '@sand/devices-contract'

export type InstallChannel = 'release' | 'nightly' | 'dev'

const installer = 'https://vaakx-dev.github.io/sand/install'
const channelEnv = 'SAND_CHANNEL'

const powershellQuoted = (value: string) => `'${value.replaceAll("'", "''")}'`

const posixQuoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`

const variables = (link: string, channel: InstallChannel) => [
  ...(channel === 'release' ? [] : [[channelEnv, channel] as const]),
  [installJoinEnv, link] as const,
]

export const installCommand = (platform: InstallPlatform, link: string, channel: InstallChannel = 'release') => {
  const env = variables(link, channel)
  if (platform === 'win32') return `${env.map(([name, value]) => `$env:${name}=${powershellQuoted(value)}`).join('; ')}; irm ${installer}.ps1 | iex`
  return `curl -fsSL ${installer}.sh | ${env.map(([name, value]) => `${name}=${posixQuoted(value)}`).join(' ')} sh`
}
