const named = new Map(
  Object.entries({
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: '\u00a0',
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
  }),
)

const entity = /^&(?:#(\d{1,7})|#[xX]([\da-fA-F]{1,6})|([a-zA-Z][a-zA-Z\d]{1,31}));/

const codePoint = (value: number) => (value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '�')

const valueOf = ([, decimal, hex, name = '']: RegExpExecArray) => {
  if (decimal) return codePoint(Number(decimal))
  if (hex) return codePoint(parseInt(hex, 16))
  return named.get(name)
}

export const decodeEntity = (source: string) => {
  const match = entity.exec(source)
  if (!match) return undefined
  const value = valueOf(match)
  return value === undefined ? undefined : { value, length: match[0].length }
}
