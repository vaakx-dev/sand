const named: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  larr: '←',
  rarr: '→',
  uarr: '↑',
  darr: '↓',
  times: '×',
  middot: '·',
  bull: '•',
  deg: '°',
}

const entity = /^&(?:#(\d{1,7})|#[xX]([\da-fA-F]{1,6})|([a-zA-Z][a-zA-Z\d]{1,31}));/

const codePoint = (value: number) => (value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '�')

export const decodeEntity = (source: string) => {
  const match = entity.exec(source)
  if (!match) return undefined
  const [raw, decimal, hex, name] = match
  const value = decimal ? codePoint(Number(decimal)) : hex ? codePoint(parseInt(hex, 16)) : named[name!]
  return value === undefined ? undefined : { value, length: raw.length }
}
