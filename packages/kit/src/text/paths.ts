export const tildeHome = (text: string) =>
  text
    .replace(/(^|[\s'"=(])\/(?:home|Users)\/[^/\s'"]+(?=[/\s'"]|$)/g, '$1~')
    .replace(/(^|[\s'"=(])[A-Za-z]:[\\/]Users[\\/][^\\/\s'"]+(?=[\\/\s'"]|$)/gi, '$1~')

export const folderName = (path: string) => path.split(/[\\/]/).filter(Boolean).at(-1) ?? path

const windowsPath = /^([A-Za-z]:[\\/]|\\\\)/

export const isInside = (path: string, folder: string) => {
  const fold = (text: string) => (windowsPath.test(path) || windowsPath.test(folder) ? text.toLowerCase() : text)
  const base = fold(folder.replace(/[\\/]+$/, ''))
  const full = fold(path)
  return Boolean(base) && full.startsWith(base) && /[\\/]/.test(full.charAt(base.length))
}
