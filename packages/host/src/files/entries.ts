const names = (dir: string, pattern: string) =>
  Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: dir, onlyFiles: false, dot: true })).catch((): string[] => [])

export const folderEntries = async (dir: string) => {
  const [all, folders] = await Promise.all([names(dir, '*'), names(dir, '*/')])
  const isFolder = new Set(folders)
  return { files: all.filter(name => !isFolder.has(name)), folders }
}
