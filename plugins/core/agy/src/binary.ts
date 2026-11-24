import { appBinary } from '@sand/app-plan'
import { homedir } from 'node:os'
import { join } from 'node:path'

const installed = () => {
  if (process.platform !== 'win32') return join(homedir(), '.local', 'bin', 'agy')
  return join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'agy', 'bin', 'agy.exe')
}

const folderArgs = (folder?: string) => (folder ? ['--gemini_dir', folder] : [])

const agy = appBinary({ command: 'agy', app: 'Antigravity', install: 'https://antigravity.google/docs/getting-started', installed: [installed()] })

const agentArgs = (agent?: string) => (agent ? ['--agent', agent] : [])

const acpArgs = ({ folder, agent }: { folder?: string; agent?: string }) => ['acp', '--disable-telemetry', '--include-default-customizations=false', ...folderArgs(folder), ...agentArgs(agent)]

const loginArgs = (folder?: string) => ['acp', '--login', ...folderArgs(folder)]

const usageArgs = (folder?: string) => [...folderArgs(folder), '--print', '/usage']

export { acpArgs, agy, loginArgs, usageArgs }
