const archive = /\.(zip|tar|tgz|gz|bz2|xz|7z|rar)$/i

export const isArchiveName = (name: string) => archive.test(name)
