export interface GitResult {
  code: number
  out: string
  err: string
}

export interface GitOptions {
  env?: Record<string, string | undefined>
  input?: string
  timeoutMs?: number
}

const quiet = {
  GIT_TERMINAL_PROMPT: '0',
  GCM_INTERACTIVE: 'never',
  GIT_EDITOR: 'true',
  GIT_MERGE_AUTOEDIT: 'no',
}

const reason = ({ err, out }: GitResult) => {
  const lines = `${err}\n${out}`.split('\n').map(line => line.trim())
  const error = lines.find(line => /^(fatal|error):/.test(line))
  const found = error ? error.replace(/^\w+:\s*/, '') : lines.find(line => line.startsWith('CONFLICT'))
  return found || lines.find(Boolean)
}

export const git = async (cwd: string, args: string[], { env = { ...process.env, ...quiet }, input, timeoutMs }: GitOptions = {}): Promise<GitResult> => {
  const child = Bun.spawn(['git', '-c', 'core.quotepath=off', '-c', 'core.longpaths=true', ...args], {
    cwd,
    env,
    timeout: timeoutMs,
    stdin: input === undefined ? 'ignore' : new Blob([input]),
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
  })
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  return { code, out, err }
}

export const gitOk = async (cwd: string, args: string[], options?: GitOptions) => {
  const result = await git(cwd, args, options)
  if (result.code !== 0) throw new Error(reason(result) || `git ${args[0]} failed`)
  return result.out.trim()
}

export const gitMaybe = async (cwd: string, args: string[], options?: GitOptions) => {
  const result = await git(cwd, args, options)
  return result.code === 0 ? result.out.trim() : undefined
}
