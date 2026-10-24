export const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1)

export const extension = (path: string) => fileName(path).split('.').pop()?.toLowerCase() ?? ''
