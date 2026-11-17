export const errorCode = (error: unknown) => (error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : undefined)

export const isMissing = (error: unknown) => {
  const code = errorCode(error)
  return code === 'ENOENT' || code === 'ENOTDIR'
}
