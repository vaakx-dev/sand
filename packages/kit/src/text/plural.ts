export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export const plurals = (counts: Record<string, number>) =>
  Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([word, count]) => plural(count, word))
    .join(', ')
