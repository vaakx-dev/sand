const withScheme = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?([^/:]*)(?::\d*)?(\/.*)?$/i
const scpLike = /^(?:[^@/]+@)?([^/:]{2,}):(?!\/\/)(.+)$/

const trimEnd = (text: string) => text.replace(/\/+$/, '').replace(/\.git$/, '').replace(/\/+$/, '')

export const remoteKey = (url: string): string => {
  const text = url.trim()
  if (!text) return ''
  const match = withScheme.exec(text) ?? scpLike.exec(text)
  if (!match) return trimEnd(text)
  const host = (match[1] ?? '').toLowerCase()
  const path = (match[2] ?? '').replace(/^\/+/, '')
  return trimEnd(host ? `${host}/${path}` : `/${path}`)
}
