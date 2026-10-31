import type { GitOptions, GitResult } from '../contract'
import { classify } from './classify'
import { limited } from './limit'
import { startGit } from './spawn'
import { readStream } from './stream'

export const git = (cwd: string, args: string[], options: GitOptions = {}): Promise<GitResult> =>
  limited(options.timeoutMs, async () => {
    const child = startGit(cwd, args, options)
    const [out, err, code] = await Promise.all([readStream(child.stdout, options.onLine), readStream(child.stderr, options.onLine), child.exited])
    return { code, out, err }
  })

export const gitOutput = async (cwd: string, args: string[], options: GitOptions = {}) => {
  const result = await git(cwd, args, options)
  if (result.code !== 0) throw classify(result, args, options.what)
  return result.out
}

export const gitOk = async (cwd: string, args: string[], options?: GitOptions) => (await gitOutput(cwd, args, options)).trim()

export const gitMaybe = async (cwd: string, args: string[], options?: GitOptions) => {
  const result = await git(cwd, args, options)
  return result.code === 0 ? result.out.trim() : undefined
}
