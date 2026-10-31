export const tildeHome = (text: string) =>
  text
    .replace(/(^|[\s'"=(])\/(?:home|Users)\/[^/\s'"]+(?=[/\s'"]|$)/g, '$1~')
    .replace(/(^|[\s'"=(])[A-Za-z]:[\\/]Users[\\/][^\\/\s'"]+(?=[\\/\s'"]|$)/gi, '$1~')

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
