import type { SyncSetup } from '@sand/protocol'
import { isDirectory } from '../folder/stat'

const timeout = 10 * 60 * 1000
const tail = 4096

export const runSetup = async (folder: string, command: string): Promise<SyncSetup> => {
  if (!command.trim()) throw new Error('A command is required')
  if (!(await isDirectory(folder))) throw new Error(`${folder} is not a folder`)
  const child = Bun.spawn(['sh', '-c', `exec 2>&1\n${command}`], { cwd: folder, stdin: 'ignore', stdout: 'pipe', stderr: 'ignore', timeout })
  const [bytes, code] = await Promise.all([new Response(child.stdout).bytes(), child.exited])
  return { code, output: new TextDecoder().decode(bytes.slice(-tail)) }
}
