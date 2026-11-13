import type { Addon } from '../contract'

const wordsOf = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean)

const textOf = ({ label, summary, readme, source }: Addon) => [label, summary, readme, source?.label ?? ''].join('\n').toLowerCase()

const searchAddons = (addons: Addon[], query: string) => {
  const words = wordsOf(query)
  if (!words.length) return addons
  const found = addons.filter(addon => words.every(word => textOf(addon).includes(word)))
  const named = (addon: Addon) => words.every(word => addon.label.toLowerCase().includes(word))
  return [...found.filter(named), ...found.filter(addon => !named(addon))]
}

export { searchAddons }
