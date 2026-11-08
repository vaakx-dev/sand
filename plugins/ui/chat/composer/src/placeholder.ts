import { derive, sig } from '@vaakx-dev/vrui'

type Source = () => string | undefined

export const createPlaceholders = (fallback: () => string) => {
  const sources = sig<Source[]>([])
  return {
    text: derive(() => sources.get().map(source => source()).findLast(Boolean) ?? fallback()),
    add(source: Source) {
      sources.update(all => [...all, source])
      return () => sources.update(all => all.filter(other => other !== source))
    },
  }
}
