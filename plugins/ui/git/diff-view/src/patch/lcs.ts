export const commonTokens = (before: string[], after: string[]): [boolean[], boolean[]] => {
  const cols = after.length + 1
  const table = new Uint16Array((before.length + 1) * cols)
  const at = (i: number, j: number) => table[i * cols + j]!
  for (let i = before.length - 1; i >= 0; i--)
    for (let j = after.length - 1; j >= 0; j--) table[i * cols + j] = before[i] === after[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1))
  const keepBefore = before.map(() => false)
  const keepAfter = after.map(() => false)
  let i = 0
  let j = 0
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      keepBefore[i++] = true
      keepAfter[j++] = true
    } else if (at(i + 1, j) >= at(i, j + 1)) i++
    else j++
  }
  return [keepBefore, keepAfter]
}
