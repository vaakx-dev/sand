const absolute = /^([\\/]|[A-Za-z]:)/

const unsafeSegment = /[<>:"|?*\x00-\x1f]|^\.\.?$|[. ]$/

const reservedName = /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i

export const safeEntryPath = (name: string) => {
  if (absolute.test(name)) return undefined
  const segments = name.replaceAll('\\', '/').split('/').filter(Boolean)
  if (!segments.length || segments.some(segment => unsafeSegment.test(segment) || reservedName.test(segment))) return undefined
  return segments.join('/')
}
