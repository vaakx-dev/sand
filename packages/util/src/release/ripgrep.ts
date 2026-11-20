import { join } from 'node:path'

const ripgrepVersion = '15.2.0'

const ripgrepBinary = (root: string) => join(root, 'ripgrep', ripgrepVersion, process.platform === 'win32' ? 'rg.exe' : 'rg')

export { ripgrepBinary, ripgrepVersion }
