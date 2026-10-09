const inherited = () => Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')))

const windows = process.platform === 'win32'
const nullDevice = windows ? 'NUL' : '/dev/null'
const longPaths = windows ? { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.longpaths', GIT_CONFIG_VALUE_0: 'true' } : {}

const fixed = {
  GIT_CONFIG_GLOBAL: nullDevice,
  GIT_CONFIG_SYSTEM: nullDevice,
  ...longPaths,
  GIT_TERMINAL_PROMPT: '0',
  GIT_AUTHOR_NAME: 'sand',
  GIT_AUTHOR_EMAIL: 'sand@localhost',
  GIT_COMMITTER_NAME: 'sand',
  GIT_COMMITTER_EMAIL: 'sand@localhost',
  LC_ALL: 'C',
}

export interface GitOptions {
  cwd?: string
  env?: Record<string, string>
  input?: string
}

export interface GitResult {
  code: number
  out: string
  err: string
}

export const git = async (args: string[], options: GitOptions = {}): Promise<GitResult> => {
  const child = Bun.spawn(['git', ...args], {
    cwd: options.cwd,
    env: { ...inherited(), ...fixed, ...options.env },
    stdin: options.input === undefined ? 'ignore' : new Blob([options.input]),
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
  })
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  return { code, out, err }
}

export const gitOut = async (args: string[], options: GitOptions = {}) => {
  const result = await git(args, options)
  if (result.code !== 0) throw new Error(result.err.trim() || `git ${args[0]} failed`)
  return result.out
}
