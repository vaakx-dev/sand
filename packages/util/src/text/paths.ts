const PATH_START = String.raw`(?<![\w.~\\/-])(?<!(?:^|\W)[a-z]:)`
const PATH_END = String.raw`(?=\.?(?:[\\/\s'"\x60:;,()]|$))`
const ACCOUNT = String.raw`(?!(?:Public|Shared|Default)\b)[^\\/\s'"\x60:;,()]+?${PATH_END}`
const HOME_FOLDERS = new RegExp(String.raw`${PATH_START}(?:/root${PATH_END}|/(?:home|Users)/${ACCOUNT}|(?:/mnt)?/[a-z]/Users/${ACCOUNT}|[a-z]:[\\/]+Users[\\/]+${ACCOUNT})`, 'gi')

export const tildeHome = (text: string) => text.replace(HOME_FOLDERS, '~')

export const comparePaths = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

export const folderName = (path: string) => path.split(/[\\/]/).filter(Boolean).at(-1) ?? path

const windowsPath = /^([A-Za-z]:[\\/]|\\\\)/

const folding = (a: string, b: string) =>
  windowsPath.test(a) || windowsPath.test(b) ? (text: string) => text.replaceAll('\\', '/').toLowerCase() : (text: string) => text

const trimmed = (path: string) => path.replace(/[\\/]+$/, '')

export const isInside = (path: string, folder: string) => {
  const fold = folding(path, folder)
  const base = fold(trimmed(folder))
  const full = fold(path)
  return Boolean(base) && full.startsWith(base) && /[\\/]/.test(full.charAt(base.length))
}

export const samePath = (a: string, b: string) => {
  const fold = folding(a, b)
  return fold(trimmed(a)) === fold(trimmed(b))
}
