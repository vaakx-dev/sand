import { homedir } from 'node:os'
import { join } from 'node:path'

const INSTALL_URL = 'https://antigravity.google/docs/getting-started'

function defaultBinaryPath(): string {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local')
    return join(localAppData, 'agy', 'bin', 'agy.exe')
  }
  return join(homedir(), '.local', 'bin', 'agy')
}

async function findBinary(): Promise<string | undefined> {
  const onPath = Bun.which('agy')
  if (onPath) return onPath
  const fallback = defaultBinaryPath()
  return (await Bun.file(fallback).exists()) ? fallback : undefined
}

async function requireBinary(): Promise<string> {
  const found = await findBinary()
  if (!found) throw new Error(`Antigravity CLI (agy) isn't installed on this PC. Install it from ${INSTALL_URL}, sign in with \`agy\`, then try again.`)
  return found
}

function acpArgs(folder?: string): string[] {
  return ['acp', '--disable-telemetry', '--include-default-customizations=false', ...(folder ? ['--gemini_dir', folder] : [])]
}

function loginArgs(folder?: string): string[] {
  return ['acp', '--login', ...(folder ? ['--gemini_dir', folder] : [])]
}

export { acpArgs, findBinary, INSTALL_URL, loginArgs, requireBinary }
