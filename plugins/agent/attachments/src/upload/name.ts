const unsafeCharacters = /[<>:"/\\|?*\x00-\x1f]/g

const reservedName = /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i

const longestName = 150

export const safeName = (name: string) => {
  const cleaned = name.replace(unsafeCharacters, '_').trim().replace(/[. ]+$/, '').slice(-longestName)
  if (!cleaned) return 'file'
  return reservedName.test(cleaned) ? `_${cleaned}` : cleaned
}
