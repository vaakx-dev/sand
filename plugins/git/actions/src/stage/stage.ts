import type { GitLayout, GitOptions, GitRunner } from '@sand/git/contract'
import { literalPaths, pathInput, pathspecFromInput } from './pathspec'

export interface PathCommand {
  args: string[]
  options: GitOptions
}

export const pathCommand = (args: string[], paths?: string[]): PathCommand =>
  paths ? { args: [...args, ...pathspecFromInput], options: { env: literalPaths, input: pathInput(paths) } } : { args, options: {} }

export const stagePaths = async (git: GitRunner, repo: GitLayout, paths?: string[]) => {
  const command = pathCommand(['add', '-A'], paths)
  return { args: command.args, result: await git.run(repo.root, command.args, command.options) }
}
