import { readFile } from 'node:fs/promises'

const output = async (command: string[]) => {
  try {
    const proc = Bun.spawn(command, { stdin: 'ignore', stdout: 'pipe', stderr: 'ignore', windowsHide: true })
    const text = await new Response(proc.stdout).text()
    return (await proc.exited) === 0 ? text.trim() : undefined
  } catch {
    return undefined
  }
}

const linuxLine = (pid: number) =>
  readFile(`/proc/${pid}/cmdline`, 'utf8').then(
    text => text.split('\0').join(' ').trim(),
    () => undefined,
  )

const windowsQuery = (pid: number) => `(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CommandLine`

export const commandLine = (pid: number) => {
  if (process.platform === 'win32') return output(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', windowsQuery(pid)])
  if (process.platform === 'linux') return linuxLine(pid)
  return output(['ps', '-ww', '-o', 'command=', '-p', String(pid)])
}
