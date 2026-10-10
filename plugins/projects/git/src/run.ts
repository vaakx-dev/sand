export const git = async (args: string[], cwd: string) => {
  const child = Bun.spawn(['git', ...args], { cwd, stdin: 'ignore', stdout: 'pipe', stderr: 'ignore', windowsHide: true })
  const [output, code] = await Promise.all([new Response(child.stdout).text(), child.exited])
  return code === 0 ? output : undefined
}
