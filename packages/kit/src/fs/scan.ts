const missing = (error: unknown) => {
  const code = (error as { code?: string }).code
  return code === 'ENOENT' || code === 'ENOTDIR'
}

export const scanFolder = async (dir: string, pattern: string) => {
  try {
    return (await Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: dir }))).sort()
  } catch (error) {
    if (missing(error)) return []
    throw error
  }
}
