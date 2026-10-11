import { isFolder } from '@sand/kit/fs'
import type { SyncSetup } from '../contract'

const timeout = 10 * 60 * 1000
const tail = 4096

const lastOutput = (bytes: Uint8Array) => new TextDecoder().decode(bytes.slice(-tail))

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
  return { code, output: lastOutput(await new Blob([out, err]).bytes()) }
}

const runPosix = async (folder: string, command: string): Promise<SyncSetup> => {
  const child = Bun.spawn(['sh', '-c', `exec 2>&1\n${command}`], { cwd: folder, stdin: 'ignore', stdout: 'pipe', stderr: 'ignore', timeout, windowsHide: true })
  const [bytes, code] = await Promise.all([new Response(child.stdout).bytes(), child.exited])
  return { code, output: lastOutput(bytes) }
}

export const runSetup = async (folder: string, command: string): Promise<SyncSetup> => {
  if (!command.trim()) throw new Error('A command is required')
  if (!(await isFolder(folder))) throw new Error(`${folder} is not a folder`)
  return process.platform === 'win32' ? runWindows(folder, command) : runPosix(folder, command)
}
