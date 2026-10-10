export interface GitResult {
  code: number
  out: string
  err: string
}

const quiet = {
  GIT_TERMINAL_PROMPT: '0',
  GCM_INTERACTIVE: 'never',
  GIT_EDITOR: 'true',
  GIT_MERGE_AUTOEDIT: 'no',
}

export const git = async (cwd: string, args: string[]): Promise<GitResult> => {
  const child = Bun.spawn(['git', '-c', 'core.quotepath=off', '-c', 'core.longpaths=true', ...args], {
    cwd,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
    env: { ...process.env, ...quiet },
  })
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  return { code, out: out.trim(), err: err.trim() }
}

const reason = ({ err, out }: GitResult) => {
  const lines = `${err}\n${out}`.split('\n').map(line => line.trim())
  const found = lines.find(line => /^(fatal|error):/.test(line))?.replace(/^\w+:\s*/, '') ?? lines.find(line => line.startsWith('CONFLICT'))
  return found || lines.find(Boolean)
}

export const gitOk = async (cwd: string, args: string[]) => {
  const result = await git(cwd, args)
  if (result.code !== 0) throw new Error(reason(result) || `git ${args[0]} failed`)
  return result.out
}

export const gitMaybe = async (cwd: string, args: string[]) => {
  const result = await git(cwd, args)
  return result.code === 0 ? result.out : undefined
}
