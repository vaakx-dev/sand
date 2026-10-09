export const gitFiles = async (cwd: string) => {
  try {
    const args = ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z']
    const child = Bun.spawn(args, { cwd, stdout: 'pipe', stderr: 'ignore', windowsHide: true })
    const [output, code] = await Promise.all([new Response(child.stdout).text(), child.exited])
    return code === 0 ? output.split('\0').filter(Boolean) : undefined
  } catch {
    return undefined
  }
}
