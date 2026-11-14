import { searchWords, textWords } from '@sand/util'
import type { PaletteItem } from '../contract'

type Hit = 'word' | 'prefix' | 'inside'

type Used = (visits: string) => number

interface Scored {
  item: PaletteItem
  score: number
  index: number
}

const LABEL_GRADES: Record<Hit, number> = { word: 6, prefix: 5, inside: 4 }
const TEXT_GRADES: Record<Hit, number> = { word: 3, prefix: 2, inside: 1 }
const START_BONUS = 1
const USE_WEIGHT = 0.9
const INSIDE_LETTERS = 3
const PER_GROUP = 30

const holdsInside = (word: string, needle: string) => needle.length >= INSIDE_LETTERS && !/\d/.test(word) && word.includes(needle)

const hitIn = (words: string[], needle: string): Hit | undefined => {
  if (words.includes(needle)) return 'word'
  if (words.some(word => word.startsWith(needle))) return 'prefix'
  return words.some(word => holdsInside(word, needle)) ? 'inside' : undefined
}

const grade = (label: string[], text: string[], needle: string) => {
  const inLabel = hitIn(label, needle)
  if (inLabel) return LABEL_GRADES[inLabel]
  const inText = hitIn(text, needle)
  return inText && TEXT_GRADES[inText]
}

const startsWithQuery = (label: string[], words: string[]) =>
  words.every((word, at) => (at === words.length - 1 ? label[at]?.startsWith(word) : label[at] === word))

const quality = (item: PaletteItem, words: string[]) => {
  const label = textWords(item.label)
  const text = textWords(`${item.detail ?? ''} ${item.search ?? ''}`)
  let total = startsWithQuery(label, words) ? START_BONUS : 0
  for (const word of words) {
    const found = grade(label, text, word)
    if (!found) return undefined
    total += found
  }
  return total
}

const scored = (item: PaletteItem, index: number, words: string[], used: Used): Scored | undefined => {
  const found = quality(item, words)
  if (found === undefined) return undefined
  const use = item.visits ? used(item.visits) * USE_WEIGHT : 0
  return { item, score: found + use, index }
}

const best = (found: Scored[]) =>
  found
    .toSorted((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, PER_GROUP)
    .map(entry => entry.item)

const ranked = (items: PaletteItem[], query: string, used: Used) => {
  const words = searchWords(query)
  if (!words.length) return []
  const groups = new Map<string, Scored[]>()
  items.forEach((item, index) => {
    const found = scored(item, index, words, used)
    if (!found) return
    const group = item.group ?? ''
    const members = groups.get(group) ?? []
    members.push(found)
    groups.set(group, members)
  })
  return [...groups.values()].flatMap(best)
}

export { PER_GROUP, ranked, type Used }
