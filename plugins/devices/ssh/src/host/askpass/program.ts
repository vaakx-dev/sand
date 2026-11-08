import { chmod, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export interface AskpassProgram {
  SSH_ASKPASS: string
  BUN_OPTIONS?: string
}

const helper = join(import.meta.dir, 'helper.ts')

const posixQuoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`

const windowsProgram = (): AskpassProgram => ({ SSH_ASKPASS: process.execPath, BUN_OPTIONS: `"${helper.replaceAll('\\', '/')}"` })

const posixProgram = async (folder: string): Promise<AskpassProgram> => {
  const path = join(folder, 'askpass.sh')
  await mkdir(folder, { recursive: true })
  await Bun.write(path, `#!/bin/sh\nexec ${posixQuoted(process.execPath)} ${posixQuoted(helper)} "$@"\n`)
  await chmod(path, 0o700)
  return { SSH_ASKPASS: path }
}

export const askpassProgram = async (folder: string) => (process.platform === 'win32' ? windowsProgram() : posixProgram(folder))
