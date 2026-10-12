export const maxUnpackedBytes = 4 * 1024 ** 3

export type Budget = ReturnType<typeof createBudget>

export const createBudget = (total = maxUnpackedBytes) => {
  let left = total
  const take = (bytes: number) => {
    left -= bytes
    if (left < 0) throw new Error(`the contents are larger than ${total / 1024 ** 3} GB`)
  }
  return { take, spent: () => left <= 0 }
}
