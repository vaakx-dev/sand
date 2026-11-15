import { child, numberAttribute } from '../xml'

type Bullet = { kind: 'none' } | { kind: 'character'; character: string } | { kind: 'number'; scheme: string; start: number }

const DOT = '•'

const SYMBOL_FONTS = /wingdings|webdings|symbol/i

const ROMAN: [number, string][] = [
  [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
]

const roman = (value: number) =>
  ROMAN.reduce(
    ({ left, text }, [size, letters]) => ({ left: left % size, text: text + letters.repeat(Math.floor(left / size)) }),
    { left: value, text: '' },
  ).text

const alphabetic = (value: number): string => (value > 26 ? alphabetic(Math.floor((value - 1) / 26)) : '') + String.fromCharCode(97 + ((value - 1) % 26))

const counterText = (style: string, value: number) => {
  switch (style) {
    case 'alphaLc':
      return alphabetic(value)
    case 'alphaUc':
      return alphabetic(value).toUpperCase()
    case 'romanLc':
      return roman(value)
    case 'romanUc':
      return roman(value).toUpperCase()
    default:
      return String(value)
  }
}

const numberLabel = (scheme: string, value: number) => {
  const [, style = 'arabic', punctuation = 'Period'] = /^(arabic|alphaLc|alphaUc|romanLc|romanUc)(.*)$/.exec(scheme) ?? []
  const text = counterText(style, value)
  if (punctuation.startsWith('ParenBoth')) return `(${text})`
  if (punctuation.startsWith('ParenR')) return `${text})`
  if (punctuation.startsWith('Plain')) return text
  return `${text}.`
}

const characterOf = (node: Element, character: Element) => {
  const symbolFont = SYMBOL_FONTS.test(child(node, 'buFont')?.getAttribute('typeface') ?? '')
  return symbolFont ? DOT : (character.getAttribute('char') ?? DOT)
}

const bulletOf = (node: Element): Bullet | undefined => {
  if (child(node, 'buNone')) return { kind: 'none' }
  const character = child(node, 'buChar')
  if (character) return { kind: 'character', character: characterOf(node, character) }
  const numbered = child(node, 'buAutoNum')
  if (numbered) return { kind: 'number', scheme: numbered.getAttribute('type') ?? 'arabicPeriod', start: numberAttribute(numbered, 'startAt') ?? 1 }
  return undefined
}

const numbering = () => {
  const counts = new Map<number, number>()
  const label = (level: number, bullet: Bullet | undefined) => {
    for (const deeper of [...counts.keys()]) if (deeper > level) counts.delete(deeper)
    if (bullet?.kind !== 'number') {
      counts.delete(level)
      return bullet?.kind === 'character' ? bullet.character : undefined
    }
    const value = (counts.get(level) ?? bullet.start - 1) + 1
    counts.set(level, value)
    return numberLabel(bullet.scheme, value)
  }
  return { label }
}

export { bulletOf, numbering, type Bullet }
