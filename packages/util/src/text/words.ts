type Range = [start: number, end: number]

const WORD = /[\p{L}\p{N}]+/gu
const MOST_WORDS = 8

const foldChar = (char: string) => (char < '\x80' ? char.toLowerCase() : char.normalize('NFD').charAt(0).toLowerCase().charAt(0) || char)

const foldText = (text: string) => {
  let folded = ''
  for (const char of text) folded += char.length === 1 ? foldChar(char) : char
  return folded
}

const textWords = (text: string) => foldText(text).match(WORD) ?? []

const searchWords = (query: string) => [...new Set(textWords(query))].slice(0, MOST_WORDS)

const wordStart = (folded: string, at: number) => at === 0 || !/[\p{L}\p{N}]/u.test(folded.charAt(at - 1))

const merged = (ranges: Range[]) =>
  ranges
    .toSorted((a, b) => a[0] - b[0])
    .reduce<Range[]>((kept, range) => {
      const last = kept.at(-1)
      if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
      else kept.push([...range])
      return kept
    }, [])

const occurrences = (folded: string, needle: string) => {
  const found: number[] = []
  for (let at = folded.indexOf(needle); needle && at >= 0; at = folded.indexOf(needle, at + needle.length)) found.push(at)
  return found
}

const textMatches = (text: string, needle: string): Range[] => {
  const wanted = foldText(needle)
  return occurrences(foldText(text), wanted).map(at => [at, at + wanted.length])
}

const wordMatches = (text: string, words: string[]): Range[] => {
  const folded = foldText(text)
  return merged(words.flatMap(word => occurrences(folded, word).filter(at => wordStart(folded, at)).map((at): Range => [at, at + word.length])))
}

export { foldText, searchWords, textMatches, textWords, wordMatches, type Range }
