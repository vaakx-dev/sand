import { statSync } from 'node:fs'

const isFolderNow = (path: string) => statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

const spawnIn = <Child>(cwd: string | undefined, start: () => Child) => {
  try {
    return start()
  } catch (error) {
    if (cwd !== undefined && !isFolderNow(cwd)) throw new Error(`No such folder: ${cwd}`)
    throw error
  }
}

export { spawnIn }
