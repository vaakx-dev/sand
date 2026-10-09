import { binFolder } from '../../../host/dist/layout'
import { posixPath, writePosixShim } from './posix'
import { windowsPath, writeWindowsShim } from './windows'

const isWindows = () => process.platform === 'win32'

export const writeShim = (home: string) => (isWindows() ? writeWindowsShim : writePosixShim)(home, binFolder(home))

export const putSandOnPath = async ({ home }: { home: string }): Promise<{ bin: string; changed: boolean; hint?: string }> => {
  const bin = binFolder(home)
  return isWindows() ? windowsPath({ home, bin }) : posixPath({ home, bin })
}
