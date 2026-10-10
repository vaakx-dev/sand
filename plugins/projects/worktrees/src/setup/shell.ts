const timeoutMs = 15 * 60_000
const tailLines = 6

const argv = (command: string) => (process.platform === 'win32' ? ['cmd.exe', '/d', '/s', '/c', `"${command}"`] : ['sh', '-c', command])

export const runCommand = async (cwd: string, command: string) => {
  const child = Bun.spawn(argv(command), {
    cwd,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
    windowsVerbatimArguments: process.platform === 'win32',
  })
  const timer = setTimeout(() => child.kill(), timeoutMs)
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  clearTimeout(timer)
  if (code === 0) return
  const tail = `${err}\n${out}`.trim().split('\n').slice(-tailLines).join('\n')
  throw new Error(`${command} failed${tail ? `:\n${tail}` : ''}`)
}
