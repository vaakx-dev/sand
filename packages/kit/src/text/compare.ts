export const compare = (a: string, b: string) => {
  if (a < b) return -1
  return a > b ? 1 : 0
}
