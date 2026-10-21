import { binFolder } from '@sand/util/boot'
import { posixPath, writePosixShim } from './posix'
import { windowsPath, writeWindowsShim } from './windows'

const windows = process.platform === 'win32'

export const writeShim = (home: string) => (windows ? writeWindowsShim : writePosixShim)(home, binFolder(home))

export const putSandOnPath = ({ home }: { home: string }): Promise<{ bin: string; changed: boolean; hint?: string }> =>
  (windows ? windowsPath : posixPath)(home, binFolder(home))
