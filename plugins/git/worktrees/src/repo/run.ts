import type { GitOptions, GitResult, GitRunner } from '@sand/git/contract'

export const longGitMs = 10 * 60_000

export const gitFailure = (git: GitRunner, result: GitResult, args: string[], what: string) => {
  const { message, detail } = git.classify(result, args)
  return new Error(`${what}: ${message}${detail ? `\n${detail}` : ''}`)
}

export const gitStep = async (git: GitRunner, dir: string, args: string[], what: string, options?: GitOptions) => {
  const result = await git.run(dir, args, options)
  if (result.code !== 0) throw gitFailure(git, result, args, what)
  return result.out.trim()
}
