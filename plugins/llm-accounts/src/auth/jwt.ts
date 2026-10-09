export const jwtClaims = (token: string | undefined): Record<string, any> => {
  const payload = token?.split('.')[1]
  if (!payload) return {}
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}
