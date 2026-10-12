import { isMissing } from './errors'

export const scanFolder = async (dir: string, pattern: string) => {
  try {
    return (await Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: dir }))).sort()
  } catch (error) {
    if (isMissing(error)) return []
    throw error
  }
}
