const git = async (folder: string, args: string[]) => {
  try {
    const child = Bun.spawn(['git', '-C', folder, ...args], {
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'ignore',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      windowsHide: true,
    })
    const [out, code] = await Promise.all([new Response(child.stdout).text(), child.exited])
    return code === 0 ? out.trim() || undefined : undefined
  } catch {
    return undefined
  }
}

export const gitRemote = async (folder: string) => {
  const origin = await git(folder, ['remote', 'get-url', 'origin'])
  if (origin) return origin
  const first = (await git(folder, ['remote']))?.split(/\r?\n/)[0]?.trim()
  return first ? git(folder, ['remote', 'get-url', first]) : undefined
}
