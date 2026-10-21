export const safeEnv = 'SAND_SAFE'

export const safeFromEnv = () => process.env[safeEnv] === '1'

export const withSafe = (env: Record<string, string | undefined>, safe: boolean) => {
  const { [safeEnv]: _, ...rest } = env
  return safe ? { ...rest, [safeEnv]: '1' } : rest
}
