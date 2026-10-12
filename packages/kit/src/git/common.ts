import { gitMaybe } from './run'

const known = new Map<string, string>()

export const commonDirOf = async (cwd: string) => {
  const cached = known.get(cwd)
  if (cached) return cached
  const found = await gitMaybe(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
  if (found) known.set(cwd, found)
  return found
}
