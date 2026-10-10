const env = { ...process.env, GH_PROMPT_DISABLED: '1', NO_COLOR: '1' }

export const gh = async (args: string[], cwd: string, signal?: AbortSignal) => {
  if (!Bun.which('gh')) throw new Error('The GitHub CLI (gh) is not installed')
  const child = Bun.spawn(['gh', ...args], { cwd, env, signal, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  if (code !== 0) throw new Error(err.trim() || `gh ${args[0]} failed`)
  return out
}

export const ghJson = async <T>(args: string[], cwd: string, signal?: AbortSignal): Promise<T> => JSON.parse(await gh(args, cwd, signal))
