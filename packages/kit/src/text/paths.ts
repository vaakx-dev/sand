export const tildeHome = (text: string) => text.replace(/(^|[\s'"=(])\/(?:home|Users)\/[^/\s'"]+(?=[/\s'"]|$)/g, '$1~')

export const folderName = (path: string) => path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
