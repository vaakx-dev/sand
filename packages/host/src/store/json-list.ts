const read = async <T>(file: string): Promise<T[]> => {
  try {
    const saved = await Bun.file(file).json()
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export const jsonListStore = async <T>(file: string) => {
  let items = await read<T>(file)
  return {
    list: () => items,
    async save(next: T[]) {
      items = next
      await Bun.write(file, `${JSON.stringify(items, null, 2)}\n`)
    },
  }
}

export type JsonListStore<T> = Awaited<ReturnType<typeof jsonListStore<T>>>
