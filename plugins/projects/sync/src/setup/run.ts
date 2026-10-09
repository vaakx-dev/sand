import type { SyncSetup } from '@sand/protocol'
import { isDirectory } from '../folder/stat'

const timeout = 10 * 60 * 1000
const tail = 4096

const runWindows = async (folder: string, command: string): Promise<SyncSetup> => {
  const shell = process.env.ComSpec || 'cmd.exe'
  const child = Bun.spawn([shell, '/d', '/s', '/c', `"${command}"`], {
    cwd: folder,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    timeout,
    windowsHide: true,
    windowsVerbatimArguments: true,
  })
  const [out, err, code] = await Promise.all([new Response(child.stdout).bytes(), new Response(child.stderr).bytes(), child.exited])
  const bytes = new Uint8Array(out.length + err.length)
  bytes.set(out)
  bytes.set(err, out.length)
  return { code, output: new TextDecoder().decode(bytes.slice(-tail)) }
}

export const runSetup = async (folder: string, command: string): Promise<SyncSetup> => {
  if (!command.trim()) throw new Error('A command is required')
  if (!(await isDirectory(folder))) throw new Error(`${folder} is not a folder`)
  if (process.platform === 'win32') return runWindows(folder, command)
  const child = Bun.spawn(['sh', '-c', `exec 2>&1\n${command}`], { cwd: folder, stdin: 'ignore', stdout: 'pipe', stderr: 'ignore', timeout, windowsHide: true })
  const [bytes, code] = await Promise.all([new Response(child.stdout).bytes(), child.exited])
  return { code, output: new TextDecoder().decode(bytes.slice(-tail)) }
}
