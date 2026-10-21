export const isFolder = (path: string) =>
  Bun.file(path)
    .stat()
    .then(
      info => info.isDirectory(),
      () => false,
    )
