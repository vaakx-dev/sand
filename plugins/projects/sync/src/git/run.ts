import { git as run } from '@sand/kit/git'

const inherited = () => Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')))

const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null'

const isolated = {
  GIT_CONFIG_GLOBAL: nullDevice,
  GIT_CONFIG_SYSTEM: nullDevice,
  GIT_TERMINAL_PROMPT: '0',
  GIT_AUTHOR_NAME: 'sand',
  GIT_AUTHOR_EMAIL: 'sand@localhost',
  GIT_COMMITTER_NAME: 'sand',
  GIT_COMMITTER_EMAIL: 'sand@localhost',
  LC_ALL: 'C',
}

export interface GitOptions {
  cwd: string
  env?: Record<string, string>
  input?: string
}

export const git = (args: string[], { cwd, env, input }: GitOptions) => run(cwd, args, { env: { ...inherited(), ...isolated, ...env }, input })

export const gitOut = async (args: string[], options: GitOptions) => {
  const result = await git(args, options)
  if (result.code !== 0) throw new Error(result.err.trim() || `git ${args[0]} failed`)
  return result.out
}
